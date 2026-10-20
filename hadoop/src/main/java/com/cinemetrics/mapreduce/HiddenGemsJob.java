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
 * HiddenGemsJob - Discover Underappreciated High-Quality Movies (Job 6)
 * ======================================================================
 * 
 * What is a "Hidden Gem"?
 * A hidden gem is a movie that has:
 * 1. A HIGH average rating (≥ 4.0 stars)
 * 2. A LOW number of ratings (between 5-50), meaning few people have seen it
 * 3. Enough ratings to be statistically meaningful (minimum 5)
 * 
 * The Bayesian Weighted Score:
 * ----------------------------
 * Raw averages can be misleading. A movie with 1 rating of 5.0 isn't necessarily
 * better than a movie with 50 ratings averaging 4.5. Bayesian averaging solves this
 * by "pulling" scores toward the global mean when the sample size is small.
 * 
 * Formula: weightedRating = (v/(v+m)) * R + (m/(v+m)) * C
 * 
 * Where:
 *   R = average rating for this movie
 *   v = number of votes (ratings) for this movie
 *   m = minimum votes required for "reliable" score (default: 10)
 *   C = global average rating across all movies (default: 3.5)
 * 
 * Example:
 *   Movie A: 5 ratings, avg 5.0
 *   weighted = (5/15)*5.0 + (10/15)*3.5 = 1.667 + 2.333 = 4.0
 *   
 *   Movie B: 50 ratings, avg 4.5  
 *   weighted = (50/60)*4.5 + (10/60)*3.5 = 3.75 + 0.583 = 4.333
 *   
 *   Movie B wins despite lower raw average - it has more evidence!
 * 
 * MapReduce Flow:
 * ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │ MAPPER            │────▶│ COMBINER          │────▶│ REDUCER           │
 * │                   │     │                   │     │                   │
 * │ ratings.csv       │     │ Aggregate partial │     │ Compute avg,      │
 * │ → movieId:        │     │ sum,count         │     │ weighted score,   │
 * │   "rating,1"      │     │                   │     │ filter hidden     │
 * │                   │     │                   │     │ gems              │
 * └──────────────────┘     └──────────────────┘     └──────────────────┘
 * 
 * Input:  ratings.csv
 * Output: movieId \t avgRating \t ratingCount \t weightedScore
 * 
 * Configurable Parameters (via -D flags):
 *   -D cinemetrics.hiddengems.min.ratings=5    (minimum ratings to qualify)
 *   -D cinemetrics.hiddengems.max.ratings=50   (maximum ratings - beyond this, not "hidden")
 *   -D cinemetrics.hiddengems.min.avg=4.0      (minimum average rating)
 *   -D cinemetrics.hiddengems.bayesian.m=10    (Bayesian prior weight)
 *   -D cinemetrics.hiddengems.bayesian.C=3.5   (global average / prior mean)
 * 
 * Usage:
 *   hadoop jar cinemetrics.jar hiddengems /input/ratings.csv /output/hiddengems
 *   hadoop jar cinemetrics.jar hiddengems /input/ratings.csv /output/hiddengems \
 *     -D cinemetrics.hiddengems.min.avg=4.5
 */
public class HiddenGemsJob extends Configured implements Tool {

    // Configuration keys for tuning the hidden gems discovery
    public static final String CONF_MIN_RATINGS = "cinemetrics.hiddengems.min.ratings";
    public static final String CONF_MAX_RATINGS = "cinemetrics.hiddengems.max.ratings";
    public static final String CONF_MIN_AVG = "cinemetrics.hiddengems.min.avg";
    public static final String CONF_BAYESIAN_M = "cinemetrics.hiddengems.bayesian.m";
    public static final String CONF_BAYESIAN_C = "cinemetrics.hiddengems.bayesian.C";

    /**
     * MAPPER: Emits movieId → "rating,1" for each rating record.
     * Identical to AverageRatingJob mapper - the magic happens in the reducer.
     */
    public static class HiddenGemsMapper extends Mapper<LongWritable, Text, Text, Text> {

        private final Text movieId = new Text();
        private final Text ratingInfo = new Text();

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
                String movieIdStr = fields[1];
                double rating = Double.parseDouble(fields[2]);

                movieId.set(movieIdStr);
                ratingInfo.set(rating + ",1");
                context.write(movieId, ratingInfo);

            } catch (NumberFormatException e) {
                context.getCounter("CineMetrics", "Invalid Rating Values").increment(1);
            }
        }
    }

    /**
     * COMBINER: Pre-aggregate sum,count per movie on mapper nodes.
     */
    public static class HiddenGemsCombiner extends Reducer<Text, Text, Text, Text> {

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
     * REDUCER: Compute average, apply Bayesian weighting, and filter hidden gems.
     * 
     * This reducer does three things:
     * 1. Compute the raw average rating
     * 2. Compute the Bayesian weighted score
     * 3. Filter: only output movies that qualify as "hidden gems"
     * 
     * The filtering in the reducer is a common MapReduce pattern when you need
     * to compute something before deciding whether to include it in output.
     */
    public static class HiddenGemsReducer extends Reducer<Text, Text, Text, Text> {

        private final Text result = new Text();

        // Configurable thresholds (loaded from job configuration in setup())
        private int minRatings;
        private int maxRatings;
        private double minAvg;
        private double bayesianM;   // Prior weight
        private double bayesianC;   // Prior mean (global average)

        @Override
        protected void setup(Context context) {
            // Load configuration with sensible defaults
            minRatings = context.getConfiguration().getInt(CONF_MIN_RATINGS, 5);
            maxRatings = context.getConfiguration().getInt(CONF_MAX_RATINGS, 50);
            minAvg = context.getConfiguration().getDouble(CONF_MIN_AVG, 4.0);
            bayesianM = context.getConfiguration().getDouble(CONF_BAYESIAN_M, 10.0);
            bayesianC = context.getConfiguration().getDouble(CONF_BAYESIAN_C, 3.5);
        }

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

            // ---- FILTER 1: Must have enough ratings to be meaningful ----
            if (totalCount < minRatings || totalCount > maxRatings) {
                context.getCounter("CineMetrics", "Filtered - Outside Rating Count Range").increment(1);
                return;
            }

            // ---- Compute raw average ----
            double avgRating = totalSum / totalCount;

            // ---- FILTER 2: Must have a high average rating ----
            if (avgRating < minAvg) {
                context.getCounter("CineMetrics", "Filtered - Below Minimum Average").increment(1);
                return;
            }

            // ---- Compute Bayesian weighted score ----
            // weightedRating = (v/(v+m)) * R + (m/(v+m)) * C
            double weightedScore = (totalCount / (totalCount + bayesianM)) * avgRating
                                 + (bayesianM / (totalCount + bayesianM)) * bayesianC;

            // Output: movieId \t avgRating \t ratingCount \t weightedScore
            result.set(String.format("%.4f", avgRating) + "\t"
                     + totalCount + "\t"
                     + String.format("%.4f", weightedScore));
            context.write(key, result);

            context.getCounter("CineMetrics", "Hidden Gems Found").increment(1);
        }
    }

    @Override
    public int run(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: hiddengems <input_path> <output_path>");
            System.err.println("Optional -D parameters:");
            System.err.println("  -D cinemetrics.hiddengems.min.ratings=5");
            System.err.println("  -D cinemetrics.hiddengems.max.ratings=50");
            System.err.println("  -D cinemetrics.hiddengems.min.avg=4.0");
            System.err.println("  -D cinemetrics.hiddengems.bayesian.m=10");
            System.err.println("  -D cinemetrics.hiddengems.bayesian.C=3.5");
            return 1;
        }

        Job job = Job.getInstance(getConf(), "CineMetrics - Hidden Gems Discovery");
        job.setJarByClass(HiddenGemsJob.class);

        job.setMapperClass(HiddenGemsMapper.class);
        job.setCombinerClass(HiddenGemsCombiner.class);
        job.setReducerClass(HiddenGemsReducer.class);

        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);

        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        return job.waitForCompletion(true) ? 0 : 1;
    }
}
