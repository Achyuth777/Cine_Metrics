package com.cinemetrics.mapreduce;

import org.apache.hadoop.conf.Configured;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.LongWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.Mapper;
import org.apache.hadoop.mapreduce.Reducer;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;
import org.apache.hadoop.util.Tool;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * YearRatingJob - Analyze Rating Patterns by Movie Release Year (Job 5)
 * ======================================================================
 * 
 * This job answers questions like:
 * - Are newer movies rated higher or lower than classics?
 * - Which decade produced the highest-rated movies?
 * - How does the volume of ratings change across decades?
 * 
 * Like GenrePopularityJob, this uses the Distributed Cache to load movies.csv
 * and extract the release year from the movie title.
 * 
 * Year Extraction:
 * MovieLens encodes the year in the title: "Toy Story (1995)"
 * We use a regex to find the 4-digit year in parentheses at the end.
 * 
 * MapReduce Flow:
 * ┌──────────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │ MAPPER               │────▶│ COMBINER          │────▶│ REDUCER           │
 * │                      │     │                   │     │                   │
 * │ setup(): load        │     │ Aggregate partial │     │ Compute final     │
 * │   movies.csv         │     │ sum,count per     │     │ avg rating per    │
 * │ map(): emit          │     │ year              │     │ year              │
 * │   year → "sum,count" │     │                   │     │                   │
 * └──────────────────────┘     └──────────────────┘     └──────────────────┘
 * 
 * Input:  ratings.csv (main) + movies.csv (cache)
 * Output: year \t ratingCount \t avgRating
 * 
 * Usage:
 *   hadoop jar cinemetrics.jar yearrating /input/ratings.csv /output/yearrating \
 *     -files /path/to/movies.csv
 */
public class YearRatingJob extends Configured implements Tool {

    /**
     * MAPPER: Converts each rating into a year-based emission.
     * 
     * Uses DistributedCache to look up movieId → year, then emits year → "rating,1"
     * so the combiner can pre-aggregate.
     */
    public static class YearRatingMapper extends Mapper<LongWritable, Text, Text, Text> {

        /** Lookup table: movieId → release year (as string) */
        private final Map<String, String> movieYears = new HashMap<>();
        private final Text yearKey = new Text();
        private final Text ratingInfo = new Text();

        @Override
        protected void setup(Context context) throws IOException {
            // Load movies.csv from distributed cache
            URI[] cacheFiles = context.getCacheFiles();
            if (cacheFiles != null && cacheFiles.length > 0) {
                loadMoviesFile(cacheFiles[0].toString());
            }

            // Alternative: check configuration property
            String moviesPath = context.getConfiguration().get("cinemetrics.movies.path");
            if (moviesPath != null && movieYears.isEmpty()) {
                loadMoviesFile(moviesPath);
            }
        }

        /**
         * Parse movies.csv to extract movieId → year mapping.
         * 
         * Example:
         *   "1,Toy Story (1995),Adventure|..." → movieYears["1"] = "1995"
         *   "999,No Year Movie,Drama"          → movieYears["999"] = "Unknown"
         */
        private void loadMoviesFile(String filePath) throws IOException {
            String localPath = filePath;
            if (localPath.contains("/")) {
                localPath = localPath.substring(localPath.lastIndexOf("/") + 1);
            }

            try (BufferedReader reader = new BufferedReader(new FileReader(localPath))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (CSVParser.isHeader(line)) continue;

                    String[] fields = CSVParser.parseLine(line);
                    if (fields == null || fields.length < 2) continue;

                    String movieId = fields[0];
                    String title = fields[1];

                    // Use CSVParser's year extraction utility
                    String year = CSVParser.extractYear(title);
                    movieYears.put(movieId, year);
                }
            } catch (IOException e) {
                // Retry with the full path
                try (BufferedReader reader = new BufferedReader(new FileReader(filePath))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (CSVParser.isHeader(line)) continue;
                        String[] fields = CSVParser.parseLine(line);
                        if (fields == null || fields.length < 2) continue;
                        movieYears.put(fields[0], CSVParser.extractYear(fields[1]));
                    }
                }
            }
        }

        @Override
        protected void map(LongWritable key, Text value, Context context)
                throws IOException, InterruptedException {
            
            String line = value.toString();
            if (CSVParser.isHeader(line)) return;

            String[] fields = CSVParser.parseLine(line);
            if (fields == null || fields.length < 3) {
                context.getCounter("CineMetrics", "Malformed Lines").increment(1);
                return;
            }

            try {
                String movieId = fields[1];
                double rating = Double.parseDouble(fields[2]);

                // Look up the year for this movie
                String year = movieYears.getOrDefault(movieId, "Unknown");

                // Emit: year → "rating,1"
                yearKey.set(year);
                ratingInfo.set(rating + ",1");
                context.write(yearKey, ratingInfo);

            } catch (NumberFormatException e) {
                context.getCounter("CineMetrics", "Invalid Rating Values").increment(1);
            }
        }
    }

    /**
     * COMBINER: Pre-aggregate sum,count per year on each mapper node.
     * 
     * This is safe because we're computing (sum, count) pairs which are
     * associative and commutative - the same property that makes
     * averages decomposable: avg = totalSum / totalCount
     */
    public static class YearRatingCombiner extends Reducer<Text, Text, Text, Text> {

        private final Text result = new Text();

        @Override
        protected void reduce(Text key, Iterable<Text> values, Context context)
                throws IOException, InterruptedException {

            double totalSum = 0.0;
            long totalCount = 0;

            for (Text val : values) {
                String[] parts = val.toString().split(",");
                if (parts.length == 2) {
                    totalSum += Double.parseDouble(parts[0]);
                    totalCount += Long.parseLong(parts[1]);
                }
            }

            result.set(totalSum + "," + totalCount);
            context.write(key, result);
        }
    }

    /**
     * REDUCER: Compute final statistics per year.
     * 
     * Output: year \t ratingCount \t avgRating
     */
    public static class YearRatingReducer extends Reducer<Text, Text, Text, Text> {

        private final Text result = new Text();

        @Override
        protected void reduce(Text key, Iterable<Text> values, Context context)
                throws IOException, InterruptedException {

            double totalSum = 0.0;
            long totalCount = 0;

            for (Text val : values) {
                String[] parts = val.toString().split(",");
                if (parts.length == 2) {
                    totalSum += Double.parseDouble(parts[0]);
                    totalCount += Long.parseLong(parts[1]);
                }
            }

            double avgRating = (totalCount > 0) ? totalSum / totalCount : 0.0;

            // Output: year \t ratingCount \t avgRating
            result.set(totalCount + "\t" + String.format("%.4f", avgRating));
            context.write(key, result);
        }
    }

    @Override
    public int run(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: yearrating <ratings_input> <output_path> [movies_cache_file]");
            return 1;
        }

        Job job = Job.getInstance(getConf(), "CineMetrics - Year Rating Analysis");
        job.setJarByClass(YearRatingJob.class);

        job.setMapperClass(YearRatingMapper.class);
        job.setCombinerClass(YearRatingCombiner.class);
        job.setReducerClass(YearRatingReducer.class);

        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);

        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        // Add movies.csv to distributed cache if provided
        if (args.length >= 3) {
            job.addCacheFile(new URI(args[2]));
        }

        return job.waitForCompletion(true) ? 0 : 1;
    }
}
