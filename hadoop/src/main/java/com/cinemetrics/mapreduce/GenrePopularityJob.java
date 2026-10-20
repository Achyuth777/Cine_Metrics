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
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * GenrePopularityJob - Analyze Popularity and Ratings by Genre (Job 4)
 * =====================================================================
 * 
 * This job uses the DISTRIBUTED CACHE pattern - a key technique in MapReduce!
 * 
 * The Problem:
 * We need data from TWO files (ratings.csv and movies.csv) but MapReduce mappers
 * normally process only one input file. How do we join them?
 * 
 * The Solution - Distributed Cache (Map-Side Join):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Before map() runs, Hadoop copies movies.csv to every node     │
 * │  via the Distributed Cache. The mapper loads it into a HashMap  │
 * │  during setup(), then uses it as a lookup table in map().       │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * This is efficient when one file is small enough to fit in memory (movies.csv
 * has ~62K movies = a few MB), while the other file is huge (ratings.csv has
 * ~25M ratings = several GB).
 * 
 * MapReduce Flow:
 * ┌──────────────────────┐     ┌──────────────────┐
 * │ MAPPER               │────▶│ REDUCER           │
 * │                      │     │                   │
 * │ setup():             │     │ For each genre:   │
 * │   Load movies.csv    │     │ - Count unique    │
 * │   into movieGenres   │     │   movieIds (Set)  │
 * │   HashMap            │     │ - Sum ratings     │
 * │                      │     │ - Count ratings   │
 * │ map():               │     │ - Compute avg     │
 * │   For each rating,   │     │                   │
 * │   look up genres,    │     │                   │
 * │   emit genre →       │     │                   │
 * │   "movieId,rating"   │     │                   │
 * └──────────────────────┘     └──────────────────┘
 * 
 * Input:  ratings.csv (main input) + movies.csv (distributed cache)
 * Output: genre \t uniqueMovieCount \t totalRatings \t avgRating
 * 
 * Usage:
 *   hadoop jar cinemetrics.jar genrepop /input/ratings.csv /output/genrepop \
 *     -files /path/to/movies.csv
 *   
 *   OR pass movies.csv path as third argument:
 *   hadoop jar cinemetrics.jar genrepop /input/ratings.csv /output/genrepop /input/movies.csv
 */
public class GenrePopularityJob extends Configured implements Tool {

    /**
     * MAPPER: Uses Distributed Cache to look up genres for each rated movie.
     * 
     * Key Concept - setup() vs map():
     * - setup() runs ONCE per mapper task (loads the lookup table)
     * - map() runs ONCE PER INPUT RECORD (processes each rating)
     * 
     * This is dramatically more efficient than doing a database lookup for each record!
     */
    public static class GenreMapper extends Mapper<LongWritable, Text, Text, Text> {

        /**
         * In-memory lookup table: movieId → array of genres
         * Example: "1" → ["Adventure", "Animation", "Children", "Comedy", "Fantasy"]
         */
        private final Map<String, String[]> movieGenres = new HashMap<>();
        private final Text genreKey = new Text();
        private final Text movieRating = new Text();

        /**
         * setup() - Called once before any map() calls.
         * 
         * Loads movies.csv from the Distributed Cache into our HashMap.
         * The Distributed Cache has already copied the file to the local filesystem
         * of this node, so we can read it like any local file.
         */
        @Override
        protected void setup(Context context) throws IOException {
            // Get the cached files that Hadoop distributed to this node
            URI[] cacheFiles = context.getCacheFiles();
            if (cacheFiles != null && cacheFiles.length > 0) {
                loadMoviesFile(cacheFiles[0].toString());
            }

            // Also check configuration for movies file path (alternative approach)
            String moviesPath = context.getConfiguration().get("cinemetrics.movies.path");
            if (moviesPath != null && movieGenres.isEmpty()) {
                loadMoviesFile(moviesPath);
            }
        }

        /**
         * Parse movies.csv and build the genre lookup table.
         * 
         * movies.csv format: movieId,title,genres
         * Example: 1,"Toy Story (1995)",Adventure|Animation|Children|Comedy|Fantasy
         * 
         * Genres are pipe-delimited (|). A movie with no genre has "(no genres listed)".
         */
        private void loadMoviesFile(String filePath) throws IOException {
            // Extract just the filename if it's a URI
            String localPath = filePath;
            if (localPath.contains("/")) {
                localPath = localPath.substring(localPath.lastIndexOf("/") + 1);
            }

            try (BufferedReader reader = new BufferedReader(new FileReader(localPath))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (CSVParser.isHeader(line)) continue;

                    String[] fields = CSVParser.parseLine(line);
                    if (fields == null || fields.length < 3) continue;

                    String movieId = fields[0];
                    String genresStr = fields[2];

                    // Split pipe-delimited genres: "Action|Comedy|Drama" → ["Action", "Comedy", "Drama"]
                    if (genresStr != null && !genresStr.equals("(no genres listed)")) {
                        movieGenres.put(movieId, genresStr.split("\\|"));
                    }
                }
            } catch (IOException e) {
                // Try with original path if local filename didn't work
                try (BufferedReader reader = new BufferedReader(new FileReader(filePath))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (CSVParser.isHeader(line)) continue;
                        String[] fields = CSVParser.parseLine(line);
                        if (fields == null || fields.length < 3) continue;
                        String movieId = fields[0];
                        String genresStr = fields[2];
                        if (genresStr != null && !genresStr.equals("(no genres listed)")) {
                            movieGenres.put(movieId, genresStr.split("\\|"));
                        }
                    }
                }
            }
        }

        /**
         * map() - Process each rating record.
         * 
         * For each rating, look up the movie's genres and emit one record per genre.
         * This "explodes" the data - a rating for a movie with 3 genres produces 3 output records.
         * 
         * Example:
         *   Input: "1,1,4.0,964982703" (user 1 rated movie 1 with 4.0)
         *   Movie 1 genres: Adventure, Animation, Children, Comedy, Fantasy
         *   Output: "Adventure" → "1,4.0"
         *           "Animation" → "1,4.0"
         *           "Children"  → "1,4.0"
         *           "Comedy"    → "1,4.0"
         *           "Fantasy"   → "1,4.0"
         */
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
                String rating = fields[2];
                Double.parseDouble(rating); // Validate it's a number

                // Look up this movie's genres in our cache
                String[] genres = movieGenres.get(movieId);
                if (genres == null) {
                    context.getCounter("CineMetrics", "Movies Not Found In Cache").increment(1);
                    return;
                }

                // Emit one record per genre for this rating
                for (String genre : genres) {
                    genreKey.set(genre.trim());
                    movieRating.set(movieId + "," + rating);
                    context.write(genreKey, movieRating);
                }
            } catch (NumberFormatException e) {
                context.getCounter("CineMetrics", "Invalid Rating Values").increment(1);
            }
        }
    }

    /**
     * REDUCER: Aggregate statistics per genre.
     * 
     * For each genre, we compute:
     * - uniqueMovieCount: How many distinct movies belong to this genre
     * - totalRatings: Total number of ratings across all movies in this genre
     * - avgRating: Average of all ratings in this genre
     * 
     * We use a HashSet to track unique movieIds - this is why we can't use a
     * combiner for this job (a combiner can't merge HashSets across nodes).
     * 
     * Example:
     *   Input: "Comedy" → ["1,4.0", "1,3.5", "2,5.0", "1,4.5"]
     *   Unique movies: {1, 2} → count = 2
     *   Total ratings: 4
     *   Avg rating: (4.0 + 3.5 + 5.0 + 4.5) / 4 = 4.25
     *   Output: "Comedy" \t "2" \t "4" \t "4.2500"
     */
    public static class GenreReducer extends Reducer<Text, Text, Text, Text> {

        private final Text result = new Text();

        @Override
        protected void reduce(Text key, Iterable<Text> values, Context context)
                throws IOException, InterruptedException {
            
            Set<String> uniqueMovies = new HashSet<>();
            double ratingSum = 0.0;
            long ratingCount = 0;

            for (Text val : values) {
                String[] parts = val.toString().split(",");
                if (parts.length == 2) {
                    uniqueMovies.add(parts[0]);         // Track unique movieId
                    ratingSum += Double.parseDouble(parts[1]); // Accumulate ratings
                    ratingCount++;
                }
            }

            double avgRating = (ratingCount > 0) ? ratingSum / ratingCount : 0.0;

            // Output: genre \t uniqueMovieCount \t totalRatings \t avgRating
            result.set(uniqueMovies.size() + "\t" + ratingCount + "\t" + String.format("%.4f", avgRating));
            context.write(key, result);
        }
    }

    @Override
    public int run(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: genrepop <ratings_input> <output_path> [movies_cache_file]");
            return 1;
        }

        Job job = Job.getInstance(getConf(), "CineMetrics - Genre Popularity");
        job.setJarByClass(GenrePopularityJob.class);

        job.setMapperClass(GenreMapper.class);
        // No combiner - we need exact movieId,rating pairs in the reducer
        job.setReducerClass(GenreReducer.class);

        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);

        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        // If a third argument is provided, add movies.csv to the distributed cache
        if (args.length >= 3) {
            job.addCacheFile(new URI(args[2]));
        }

        return job.waitForCompletion(true) ? 0 : 1;
    }
}
