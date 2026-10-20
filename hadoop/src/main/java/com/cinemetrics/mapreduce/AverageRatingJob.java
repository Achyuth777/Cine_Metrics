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

import java.io.IOException;

/**
 * AverageRatingJob - Compute Average Rating Per Movie (Job 1)
 * =============================================================
 * 
 * MapReduce Flow:
 * ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │     MAPPER        │────▶│    COMBINER       │────▶│     REDUCER      │
 * │                   │     │  (local reduce)   │     │                  │
 * │ ratings.csv       │     │                   │     │ For each movie:  │
 * │ → movieId:        │     │ Partial aggregate │     │ avg = sum/count  │
 * │   "rating,1"      │     │ of sum,count      │     │                  │
 * └──────────────────┘     └──────────────────┘     └──────────────────┘
 * 
 * Input:  ratings.csv (userId, movieId, rating, timestamp)
 * Output: movieId \t averageRating \t ratingCount
 * 
 * The Combiner Optimization:
 * ---------------------------
 * Without a combiner, ALL rating values for a movie are sent across the network
 * to the reducer. With a combiner, each mapper node locally sums its ratings and
 * sends just (totalSum, count) - dramatically reducing network I/O (shuffle phase).
 * 
 * The combiner uses the same logic as the reducer because average calculation
 * can be split into partial sums: avg = (sum1 + sum2) / (count1 + count2)
 * 
 * Usage:
 *   hadoop jar cinemetrics.jar avgrating /input/ratings.csv /output/avgrating
 */
public class AverageRatingJob extends Configured implements Tool {

    /**
     * MAPPER: Reads each line of ratings.csv and emits movieId → "rating,1"
     * 
     * Input format (ratings.csv):
     *   userId,movieId,rating,timestamp
     *   1,1,4.0,964982703
     *   1,3,4.0,964981247
     * 
     * Output: key=movieId, value="rating,1"
     *   "1" → "4.0,1"
     *   "3" → "4.0,1"
     * 
     * Why "rating,1" instead of just "rating"?
     * Because the combiner needs both the sum and count to compute partial aggregates.
     */
    public static class AverageRatingMapper extends Mapper<LongWritable, Text, Text, Text> {

        // Reuse objects to reduce garbage collection pressure
        // (MapReduce processes millions of records - object creation adds up!)
        private final Text movieId = new Text();
        private final Text ratingInfo = new Text();

        @Override
        protected void map(LongWritable key, Text value, Context context)
                throws IOException, InterruptedException {
            
            String line = value.toString();
            
            // Skip the CSV header row
            if (CSVParser.isHeader(line)) {
                context.getCounter("CineMetrics", "Header Lines Skipped").increment(1);
                return;
            }

            // Parse the CSV line: userId,movieId,rating,timestamp
            String[] fields = CSVParser.parseLine(line);
            if (fields == null || fields.length < 3) {
                context.getCounter("CineMetrics", "Malformed Lines").increment(1);
                return;
            }

            try {
                String movieIdStr = fields[1];
                double rating = Double.parseDouble(fields[2]);

                // Emit: movieId → "ratingValue,1"
                movieId.set(movieIdStr);
                ratingInfo.set(rating + ",1");
                context.write(movieId, ratingInfo);

            } catch (NumberFormatException e) {
                // Skip lines where the rating isn't a valid number
                context.getCounter("CineMetrics", "Invalid Rating Values").increment(1);
            }
        }
    }

    /**
     * COMBINER / REDUCER: Aggregates rating sums and counts.
     * 
     * This class serves DUAL duty - it works as both combiner and reducer:
     * 
     * As COMBINER (runs on mapper node):
     *   Input:  "1" → ["4.0,1", "3.5,1", "5.0,1"]   (from one mapper)
     *   Output: "1" → "12.5,3"                        (partial aggregate)
     * 
     * As REDUCER (runs on reducer node):
     *   Input:  "1" → ["12.5,3", "8.0,2"]             (from multiple combiners)
     *   Output: "1" \t "3.4167" \t "5"                 (final average and count)
     * 
     * The reducer detects whether it's the final stage and formats output accordingly.
     * Actually, both combiner and reducer use the same aggregation logic.
     * The output format differs only because the reducer writes the final tab-separated output.
     */
    public static class AverageRatingReducer extends Reducer<Text, Text, Text, Text> {

        private final Text result = new Text();

        @Override
        protected void reduce(Text key, Iterable<Text> values, Context context)
                throws IOException, InterruptedException {
            
            double totalSum = 0.0;
            long totalCount = 0;

            // Aggregate all partial sums and counts for this movieId
            for (Text val : values) {
                String[] parts = val.toString().split(",");
                if (parts.length == 2) {
                    totalSum += Double.parseDouble(parts[0]);
                    totalCount += Long.parseLong(parts[1]);
                }
            }

            // Compute the average rating, rounded to 4 decimal places
            double average = (totalCount > 0) ? totalSum / totalCount : 0.0;
            String avgFormatted = String.format("%.4f", average);

            // Output: movieId \t averageRating \t ratingCount
            result.set(avgFormatted + "\t" + totalCount);
            context.write(key, result);
        }
    }

    /**
     * COMBINER: Same aggregation as reducer but outputs in "sum,count" format
     * so it can be further combined or sent to the final reducer.
     */
    public static class AverageRatingCombiner extends Reducer<Text, Text, Text, Text> {

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

            // Output as "sum,count" so the reducer (or another combiner) can continue aggregating
            result.set(totalSum + "," + totalCount);
            context.write(key, result);
        }
    }

    /**
     * Configure and run the MapReduce job.
     * 
     * Job Configuration Explained:
     * - setJarByClass: Tells Hadoop which JAR contains our code (for distribution to nodes)
     * - setMapperClass: Which class processes each input record
     * - setCombinerClass: Optional local reducer that runs on mapper nodes (optimization)
     * - setReducerClass: Which class produces the final output
     * - setOutputKey/ValueClass: The data types for the output key-value pairs
     */
    @Override
    public int run(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: avgrating <input_path> <output_path>");
            return 1;
        }

        Job job = Job.getInstance(getConf(), "CineMetrics - Average Rating Per Movie");
        job.setJarByClass(AverageRatingJob.class);

        // Set the MapReduce components
        job.setMapperClass(AverageRatingMapper.class);
        job.setCombinerClass(AverageRatingCombiner.class);  // Local pre-aggregation
        job.setReducerClass(AverageRatingReducer.class);

        // Both mapper and reducer output Text key-value pairs
        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);

        // Set input and output paths from command-line arguments
        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        // Submit and wait for completion; return 0 on success, 1 on failure
        return job.waitForCompletion(true) ? 0 : 1;
    }
}
