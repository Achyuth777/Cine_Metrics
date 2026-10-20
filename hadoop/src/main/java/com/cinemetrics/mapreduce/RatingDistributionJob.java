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
 * RatingDistributionJob - Count Frequency of Each Rating Value (Job 3)
 * =====================================================================
 * 
 * MapReduce Flow:
 * ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │     MAPPER        │────▶│    COMBINER       │────▶│     REDUCER      │
 * │                   │     │                   │     │                  │
 * │ ratings.csv       │     │ Partial count     │     │ Total count per  │
 * │ → ratingValue: 1  │     │ per rating value  │     │ rating value     │
 * └──────────────────┘     └──────────────────┘     └──────────────────┘
 * 
 * MovieLens uses half-star increments: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
 * This job counts how many times each rating value appears in the dataset.
 * 
 * This is useful for understanding user behavior:
 * - Are users generous (lots of 4s and 5s)?
 * - Is there a "J-curve" (people mostly rate things they like)?
 * - Are half-star ratings less common than whole stars?
 * 
 * Input:  ratings.csv
 * Output: ratingValue \t frequency
 * 
 * Example Output:
 *   0.5    1370
 *   1.0    3326
 *   ...
 *   5.0    7463
 * 
 * Usage:
 *   hadoop jar cinemetrics.jar ratingdist /input/ratings.csv /output/ratingdist
 */
public class RatingDistributionJob extends Configured implements Tool {

    /**
     * MAPPER: Extracts the rating value from each record and emits it with count 1.
     * 
     * Input:  "1,296,5.0,1147880044"
     * Output: "5.0" → 1
     */
    public static class RatingDistMapper extends Mapper<LongWritable, Text, Text, IntWritable> {

        private final Text ratingValue = new Text();
        private static final IntWritable ONE = new IntWritable(1);

        @Override
        protected void map(LongWritable key, Text value, Context context)
                throws IOException, InterruptedException {
            
            String line = value.toString();

            if (CSVParser.isHeader(line)) {
                return;
            }

            String[] fields = CSVParser.parseLine(line);
            if (fields == null || fields.length < 3) {
                context.getCounter("CineMetrics", "Malformed Lines").increment(1);
                return;
            }

            try {
                // Validate the rating is a real number before emitting
                Double.parseDouble(fields[2]);
                ratingValue.set(fields[2]);
                context.write(ratingValue, ONE);
            } catch (NumberFormatException e) {
                context.getCounter("CineMetrics", "Invalid Rating Values").increment(1);
            }
        }
    }

    /**
     * COMBINER & REDUCER: Sum all counts for each rating value.
     * 
     * Since only 10 possible rating values exist (0.5 to 5.0), this reducer
     * will handle at most 10 keys. The combiner helps by reducing network
     * traffic even though the final reduction is trivial.
     */
    public static class RatingDistReducer extends Reducer<Text, IntWritable, Text, IntWritable> {

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
            System.err.println("Usage: ratingdist <input_path> <output_path>");
            return 1;
        }

        Job job = Job.getInstance(getConf(), "CineMetrics - Rating Distribution");
        job.setJarByClass(RatingDistributionJob.class);

        job.setMapperClass(RatingDistMapper.class);
        job.setCombinerClass(RatingDistReducer.class);  // Same logic works as combiner
        job.setReducerClass(RatingDistReducer.class);

        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(IntWritable.class);

        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        return job.waitForCompletion(true) ? 0 : 1;
    }
}
