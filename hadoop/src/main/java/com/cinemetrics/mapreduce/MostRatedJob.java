package com.cinemetrics.mapreduce;

import org.apache.hadoop.conf.Configured;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IntWritable;
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
 * MostRatedJob - Find Movies with the Most Ratings (Job 2)
 * ==========================================================
 * 
 * MapReduce Flow:
 * ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │     MAPPER        │────▶│    COMBINER       │────▶│     REDUCER      │
 * │                   │     │                   │     │                  │
 * │ ratings.csv       │     │ Partial count     │     │ Total count per  │
 * │ → movieId: 1      │     │ per movieId       │     │ movieId          │
 * └──────────────────┘     └──────────────────┘     └──────────────────┘
 * 
 * This is a classic "word count"-style MapReduce pattern:
 * - Mapper emits (movieId, 1) for each rating
 * - Combiner sums local counts
 * - Reducer sums all counts
 * 
 * Note on Sorting:
 * The output is sorted by movieId (default MapReduce behavior). To get
 * descending order by rating count, a secondary sort job or post-processing
 * step would be needed. Our Spark/Hive layer handles the final sorting.
 * 
 * Input:  ratings.csv
 * Output: movieId \t totalRatings
 * 
 * Usage:
 *   hadoop jar cinemetrics.jar mostrated /input/ratings.csv /output/mostrated
 */
public class MostRatedJob extends Configured implements Tool {

    /**
     * MAPPER: Emits a count of 1 for each rating record.
     * 
     * This is the simplest possible mapper - it just says "I saw movie X once."
     * The combiner and reducer will sum up all the 1s to get total counts.
     * 
     * Input:  "1,296,5.0,1147880044"
     * Output: "296" → 1
     */
    public static class MostRatedMapper extends Mapper<LongWritable, Text, Text, IntWritable> {

        private final Text movieId = new Text();
        private static final IntWritable ONE = new IntWritable(1);

        @Override
        protected void map(LongWritable key, Text value, Context context)
                throws IOException, InterruptedException {
            
            String line = value.toString();

            // Skip CSV header
            if (CSVParser.isHeader(line)) {
                return;
            }

            String[] fields = CSVParser.parseLine(line);
            if (fields == null || fields.length < 2) {
                context.getCounter("CineMetrics", "Malformed Lines").increment(1);
                return;
            }

            // Emit: movieId → 1
            movieId.set(fields[1]);
            context.write(movieId, ONE);
        }
    }

    /**
     * COMBINER: Sums partial counts on the mapper node.
     * 
     * Example (on one mapper node):
     *   Input:  "296" → [1, 1, 1, 1, 1]  (5 ratings for movie 296 on this node)
     *   Output: "296" → 5                 (send just the sum across the network)
     * 
     * This reduces network traffic from N individual records to 1 per movie per mapper.
     */
    public static class MostRatedCombiner extends Reducer<Text, IntWritable, Text, IntWritable> {

        private final IntWritable partialSum = new IntWritable();

        @Override
        protected void reduce(Text key, Iterable<IntWritable> values, Context context)
                throws IOException, InterruptedException {
            
            int sum = 0;
            for (IntWritable val : values) {
                sum += val.get();
            }
            partialSum.set(sum);
            context.write(key, partialSum);
        }
    }

    /**
     * REDUCER: Sums all partial counts to get the final total.
     * 
     * Example:
     *   Input:  "296" → [5, 3, 8, 2]  (from 4 different mapper nodes)
     *   Output: "296" \t "18"          (18 total ratings for movie 296)
     */
    public static class MostRatedReducer extends Reducer<Text, IntWritable, Text, IntWritable> {

        private final IntWritable totalCount = new IntWritable();

        @Override
        protected void reduce(Text key, Iterable<IntWritable> values, Context context)
                throws IOException, InterruptedException {
            
            int sum = 0;
            for (IntWritable val : values) {
                sum += val.get();
            }
            totalCount.set(sum);
            context.write(key, totalCount);
        }
    }

    @Override
    public int run(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: mostrated <input_path> <output_path>");
            return 1;
        }

        Job job = Job.getInstance(getConf(), "CineMetrics - Most Rated Movies");
        job.setJarByClass(MostRatedJob.class);

        job.setMapperClass(MostRatedMapper.class);
        job.setCombinerClass(MostRatedCombiner.class);
        job.setReducerClass(MostRatedReducer.class);

        // Output types: Text key (movieId), IntWritable value (count)
        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(IntWritable.class);

        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        return job.waitForCompletion(true) ? 0 : 1;
    }
}
