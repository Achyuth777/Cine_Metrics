package com.cinemetrics.mapreduce;

import org.apache.hadoop.util.ToolRunner;

/**
 * CineMetricsDriver - Main Entry Point for All MapReduce Jobs
 * =============================================================
 * 
 * How MapReduce Job Submission Works:
 * ------------------------------------
 * When you run a Hadoop job, you typically execute:
 *   hadoop jar cinemetrics-mapreduce-1.0.0.jar <jobName> <input> <output> [extra args]
 * 
 * This driver class acts as a dispatcher - it reads the job name argument
 * and delegates to the appropriate job class. This pattern is common in
 * production MapReduce projects where one JAR contains multiple jobs.
 * 
 * Available Jobs:
 *   avgrating    - Compute average rating per movie
 *   mostrated    - Find most-rated movies (by number of ratings)
 *   ratingdist   - Distribution of rating values (0.5 to 5.0)
 *   genrepop     - Genre popularity analysis (requires movies.csv in distributed cache)
 *   yearrating   - Average ratings by release year (requires movies.csv in distributed cache)
 *   hiddengems   - Discover hidden gem movies using Bayesian weighting
 *   ratingtrends - Monthly rating count and average trends over time
 * 
 * Usage Examples:
 *   hadoop jar cinemetrics.jar avgrating /input/ratings.csv /output/avgrating
 *   hadoop jar cinemetrics.jar genrepop /input/ratings.csv /output/genrepop -files /input/movies.csv
 */
public class CineMetricsDriver {

    /**
     * Print usage information when invalid arguments are provided.
     */
    private static void printUsage() {
        System.err.println("╔══════════════════════════════════════════════════════════════╗");
        System.err.println("║              CineMetrics MapReduce Analytics                ║");
        System.err.println("╠══════════════════════════════════════════════════════════════╣");
        System.err.println("║ Usage:                                                      ║");
        System.err.println("║   hadoop jar cinemetrics.jar <job> <input> <output> [args]   ║");
        System.err.println("║                                                              ║");
        System.err.println("║ Available Jobs:                                              ║");
        System.err.println("║   avgrating     - Average rating per movie                   ║");
        System.err.println("║   mostrated     - Most-rated movies by count                 ║");
        System.err.println("║   ratingdist    - Rating value distribution                  ║");
        System.err.println("║   genrepop      - Genre popularity analysis                  ║");
        System.err.println("║   yearrating    - Ratings by release year                    ║");
        System.err.println("║   hiddengems    - Hidden gem movie discovery                 ║");
        System.err.println("║   ratingtrends  - Monthly rating trends over time            ║");
        System.err.println("╚══════════════════════════════════════════════════════════════╝");
    }

    /**
     * Main method - entry point when the JAR is executed.
     * 
     * The first argument selects which job to run. The remaining arguments
     * are passed through to that job's run() method (typically input/output paths).
     * 
     * We use Hadoop's ToolRunner to handle standard Hadoop arguments like
     * -D for configuration properties and -files for distributed cache.
     * 
     * @param args Command-line arguments: <jobName> <input> <output> [extra args]
     */
    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            printUsage();
            System.exit(1);
        }

        // Extract the job name (first argument)
        String jobName = args[0].toLowerCase();

        // Build the remaining args array to pass to the selected job
        // (strip the job name, keep input/output paths and any extra flags)
        String[] jobArgs = new String[args.length - 1];
        System.arraycopy(args, 1, jobArgs, 0, args.length - 1);

        /*
         * Dispatch to the appropriate job using a switch statement.
         * 
         * ToolRunner.run() does several important things:
         * 1. Parses generic Hadoop options (-D, -fs, -jt, etc.)
         * 2. Sets up the Configuration object
         * 3. Calls the job's run() method
         * 4. Returns an exit code (0 = success, 1 = failure)
         */
        int exitCode;
        switch (jobName) {
            case "avgrating":
                System.out.println(">>> Starting Job: Average Rating Per Movie");
                exitCode = ToolRunner.run(new AverageRatingJob(), jobArgs);
                break;

            case "mostrated":
                System.out.println(">>> Starting Job: Most Rated Movies");
                exitCode = ToolRunner.run(new MostRatedJob(), jobArgs);
                break;

            case "ratingdist":
                System.out.println(">>> Starting Job: Rating Distribution");
                exitCode = ToolRunner.run(new RatingDistributionJob(), jobArgs);
                break;

            case "genrepop":
                System.out.println(">>> Starting Job: Genre Popularity Analysis");
                exitCode = ToolRunner.run(new GenrePopularityJob(), jobArgs);
                break;

            case "yearrating":
                System.out.println(">>> Starting Job: Year-wise Rating Analysis");
                exitCode = ToolRunner.run(new YearRatingJob(), jobArgs);
                break;

            case "hiddengems":
                System.out.println(">>> Starting Job: Hidden Gems Discovery");
                exitCode = ToolRunner.run(new HiddenGemsJob(), jobArgs);
                break;

            case "ratingtrends":
                System.out.println(">>> Starting Job: Rating Trends Over Time");
                exitCode = ToolRunner.run(new RatingTrendsJob(), jobArgs);
                break;

            default:
                System.err.println("ERROR: Unknown job name: '" + jobName + "'");
                printUsage();
                System.exit(1);
                return; // Unreachable, but keeps compiler happy
        }

        System.out.println(">>> Job '" + jobName + "' finished with exit code: " + exitCode);
        System.exit(exitCode);
    }
}
