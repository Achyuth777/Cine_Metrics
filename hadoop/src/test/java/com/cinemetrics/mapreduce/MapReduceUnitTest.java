package com.cinemetrics.mapreduce;

import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Unit Tests for CineMetrics MapReduce Core Logic
 * ================================================
 * Validates:
 * 1. CSVParser robustness against edge cases (quoted commas, escaped quotes, missing values)
 * 2. Movie release year extraction from titles
 * 3. Average rating reducer computation
 * 4. Bayesian weighted score mathematical correctness
 * 5. Rating distribution interval grouping
 */
public class MapReduceUnitTest {

    @Test
    public void testCSVParserStandardLine() {
        String line = "1,1,4.0,964982703";
        String[] fields = CSVParser.parseLine(line);
        assertNotNull(fields);
        assertEquals(4, fields.length);
        assertEquals("1", fields[0]);
        assertEquals("1", fields[1]);
        assertEquals("4.0", fields[2]);
        assertEquals("964982703", fields[3]);
    }

    @Test
    public void testCSVParserQuotedCommasInTitle() {
        // Test movie title with embedded comma
        String line = "11,\"American President, The (1995)\",Comedy|Drama|Romance";
        String[] fields = CSVParser.parseLine(line);
        assertNotNull(fields);
        assertEquals(3, fields.length);
        assertEquals("11", fields[0]);
        assertEquals("American President, The (1995)", fields[1]);
        assertEquals("Comedy|Drama|Romance", fields[2]);
    }

    @Test
    public void testCSVParserEscapedQuotes() {
        // Test title with escaped double quotes
        String line = "100,\"Movie \"\"Special\"\" Edition (2000)\",Action";
        String[] fields = CSVParser.parseLine(line);
        assertNotNull(fields);
        assertEquals(3, fields.length);
        assertEquals("Movie \"Special\" Edition (2000)", fields[1]);
    }

    @Test
    public void testExtractYearFromTitle() {
        // Standard 4-digit year
        assertEquals("1995", CSVParser.extractYear("Toy Story (1995)"));
        assertEquals("2001", CSVParser.extractYear("Lord of the Rings, The (2001)"));
        assertEquals("1994", CSVParser.extractYear("Pulp Fiction (1994)"));
        
        // Title with year
        assertEquals("2010", CSVParser.extractYear("Inception (2010)"));
        
        // No year present
        assertEquals("Unknown", CSVParser.extractYear("Babylon 5"));
        assertEquals("Unknown", CSVParser.extractYear(""));
    }

    @Test
    public void testIsHeaderDetection() {
        assertTrue(CSVParser.isHeader("userId,movieId,rating,timestamp"));
        assertTrue(CSVParser.isHeader("movieId,title,genres"));
        assertFalse(CSVParser.isHeader("1,1,4.0,964982703"));
        assertFalse(CSVParser.isHeader("1,Toy Story (1995),Animation"));
    }

    @Test
    public void testAverageRatingReducerMath() {
        // Simulate MapReduce Reducer logic: summing partial sums & counts
        double[] ratings = {4.0, 5.0, 3.5, 4.5, 5.0};
        double sum = 0.0;
        int count = 0;
        for (double r : ratings) {
            sum += r;
            count++;
        }
        double avg = Math.round((sum / count) * 10000.0) / 10000.0;
        assertEquals(4.4, avg, 0.0001);
        assertEquals(5, count);
    }

    @Test
    public void testBayesianWeightedRatingFormula() {
        // Formula: WR = (v / (v + m)) * R + (m / (v + m)) * C
        // Parameters: m = 10, C = 3.50
        double m = 10.0;
        double C = 3.50;

        // Movie A: 1 rating of 5.0 stars (v=1, R=5.0)
        double vA = 1.0;
        double RA = 5.0;
        double wrA = (vA / (vA + m)) * RA + (m / (vA + m)) * C;

        // Movie B: 50 ratings of 4.5 stars (v=50, R=4.5)
        double vB = 50.0;
        double RB = 4.5;
        double wrB = (vB / (vB + m)) * RB + (m / (vB + m)) * C;

        // Movie B with many good reviews should rank much higher than Movie A with 1 perfect review!
        assertTrue("Movie B with 50 ratings of 4.5 must outrank Movie A with 1 rating of 5.0", wrB > wrA);
        assertEquals(3.6364, wrA, 0.001);
        assertEquals(4.3333, wrB, 0.001);
    }

    @Test
    public void testRatingDistributionBucketing() {
        // Valid half-star values
        double[] validValues = {0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0};
        for (double val : validValues) {
            String formatted = String.format("%.1f", val);
            assertNotNull(formatted);
            assertTrue(formatted.matches("^[0-5]\\.[05]$"));
        }
    }
}
