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
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * RatingTrendsJob - Analyze Rating Volume and Quality Over Time (Job 7)
 * ======================================================================
 * 
 * This job reveals temporal patterns in movie ratings:
 * - When do users rate movies most frequently?
 * - Has average rating quality changed over the years?
 * - Are there seasonal patterns in rating behavior?
 * 
 * Unix Timestamp Conversion:
 * --------------------------
 * MovieLens stores timestamps as Unix epoch seconds (seconds since Jan 1, 1970).
 * Example: 964982703 → 2000-07-31T02:05:03Z → "2000-07"
 * 
 * We group by YYYY-MM to get monthly trends, which provides enough granularity
 * to see seasonal patterns without too many output rows.
 * 
 * MapReduce Flow:
 * ┌──────────────────────┐     ┌──────────────────┐     ┌──────────────────┐
 * │ MAPPER               │────▶│ COMBINER          │────▶│ REDUCER           │
 * │                      │     │                   │     │                   │
 * │ Convert timestamp    │     │ Aggregate partial │     │ Compute final     │
 * │ to YYYY-MM           │     │ sum,count per     │     │ ratingCount, avg  │
 * │ Emit: month →        │     │ month             │     │ per month         │
 * │   "rating,1"         │     │                   │     │                   │
 * └──────────────────────┘     └──────────────────┘     └──────────────────┘
 * 
 * Input:  ratings.csv
 * Output: yearMonth \t ratingCount \t avgRating
 * 
 * Usage:
 *   hadoop jar cinemetrics.jar ratingtrends /input/ratings.csv /output/ratingtrends
 */
public class RatingTrendsJob extends Configured implements Tool {

    /**
     * MAPPER: Converts each rating's Unix timestamp to YYYY-MM and emits the rating.
     * 
     * Example:
     *   Input: "1,296,5.0,1147880044"
     *   Timestamp 1147880044 → 2006-05-17 → "2006-05"
     *   Output: "2006-05" → "5.0,1"
     */
    public static class RatingTrendsMapper extends Mapper<LongWritable, Text, Text, Text> {

        private final Text yearMonth = new Text();
        private final Text ratingInfo = new Text();

        /**
         * DateTimeFormatter for YYYY-MM format.
         * We use Java's modern date/time API (java.time) which is thread-safe
         * and more intuitive than the old SimpleDateFormat.
         */
        private static final DateTimeFormatter MONTH_FORMAT =
                DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneOffset.UTC);

        @Override
        protected void map(LongWritable key, Text value, Context context)
                throws IOException, InterruptedException {

            String line = value.toString();
            if (CSVParser.isHeader(line)) return;

            String[] fields = CSVParser.parseLine(line);
            if (fields == null || fields.length < 4) {
                context.getCounter("CineMetrics", "Malformed Lines").increment(1);
                return;
            }

            try {
                double rating = Double.parseDouble(fields[2]);
                long timestamp = Long.parseLong(fields[3]);

                // Convert Unix timestamp (seconds since epoch) to YYYY-MM string
                // Instant.ofEpochSecond converts the raw number to a point in time
                // MONTH_FORMAT then formats it as "2006-05"
                String monthStr = MONTH_FORMAT.format(Instant.ofEpochSecond(timestamp));

                yearMonth.set(monthStr);
                ratingInfo.set(rating + ",1");
                context.write(yearMonth, ratingInfo);

            } catch (NumberFormatException e) {
                context.getCounter("CineMetrics", "Invalid Fields").increment(1);
            } catch (Exception e) {
                // Catch any date conversion errors
                context.getCounter("CineMetrics", "Invalid Timestamps").increment(1);
            }
        }
    }

    /**
     * COMBINER: Pre-aggregate sum,count per month on mapper nodes.
     */
    public static class RatingTrendsCombiner extends Reducer<Text, Text, Text, Text> {

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
     * REDUCER: Compute final monthly statistics.
     * 
     * Since MapReduce sorts keys alphabetically by default, and our keys are
     * formatted as "YYYY-MM", the output will be in chronological order automatically!
     * 
     * Output: yearMonth \t ratingCount \t avgRating
     */
    public static class RatingTrendsReducer extends Reducer<Text, Text, Text, Text> {

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

            // Output: yearMonth \t ratingCount \t avgRating
            result.set(totalCount + "\t" + String.format("%.4f", avgRating));
            context.write(key, result);
        }
    }

    @Override
    public int run(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: ratingtrends <input_path> <output_path>");
            return 1;
        }

        Job job = Job.getInstance(getConf(), "CineMetrics - Rating Trends");
        job.setJarByClass(RatingTrendsJob.class);

        job.setMapperClass(RatingTrendsMapper.class);
        job.setCombinerClass(RatingTrendsCombiner.class);
        job.setReducerClass(RatingTrendsReducer.class);

        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);

        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));

        return job.waitForCompletion(true) ? 0 : 1;
    }
}
