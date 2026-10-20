package com.cinemetrics.mapreduce;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * CSVParser - Robust CSV Parsing Utility for MapReduce Jobs
 * ==========================================================
 * 
 * Why do we need a custom CSV parser?
 * ------------------------------------
 * The MovieLens dataset contains tricky CSV that Java's String.split(",") can't handle:
 *   - Movie titles contain commas: "Iron Man 3, The (2013)"
 *   - Fields are quoted: "\"Toy Story (1995)\""
 *   - Quotes can be escaped by doubling: "He said \"\"hello\"\""
 * 
 * This parser handles all these edge cases correctly, following RFC 4180 CSV rules.
 * 
 * Usage Example:
 *   String line = "1,\"Toy Story (1995)\",Adventure|Animation|Children";
 *   String[] fields = CSVParser.parseLine(line);
 *   // fields[0] = "1"
 *   // fields[1] = "Toy Story (1995)"   <-- quotes removed
 *   // fields[2] = "Adventure|Animation|Children"
 */
public class CSVParser {

    /**
     * Regex pattern to extract a 4-digit year in parentheses near the end of a movie title.
     * 
     * Examples:
     *   "Toy Story (1995)"           → 1995
     *   "Iron Man 3, The (2013)"     → 2013
     *   "Se7en (a.k.a. Seven) (1995)" → 1995  (takes last match)
     *   "Movie Without Year"          → null
     */
    private static final Pattern YEAR_PATTERN = Pattern.compile("\\((\\d{4})\\)\\s*$");

    /**
     * Parse a single CSV line into an array of field values.
     * 
     * Algorithm (state machine approach):
     * 1. Walk through the line character by character
     * 2. Track whether we're inside a quoted field
     * 3. When inside quotes, only a second quote can end the field
     *    (or start an escaped quote if followed by another quote)
     * 4. When outside quotes, a comma separates fields
     * 
     * @param line The raw CSV line to parse
     * @return Array of parsed field values, or null if the line is malformed
     */
    public static String[] parseLine(String line) {
        if (line == null || line.isEmpty()) {
            return null;
        }

        List<String> fields = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (inQuotes) {
                if (c == '"') {
                    // Check if this is an escaped quote (double-quote: "")
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        // Escaped quote - add a single quote and skip the next character
                        currentField.append('"');
                        i++; // Skip the second quote
                    } else {
                        // End of quoted field
                        inQuotes = false;
                    }
                } else {
                    // Regular character inside quotes - add it
                    currentField.append(c);
                }
            } else {
                if (c == '"') {
                    // Start of a quoted field
                    inQuotes = true;
                } else if (c == ',') {
                    // Field separator - save current field and start a new one
                    fields.add(currentField.toString().trim());
                    currentField.setLength(0); // Clear the buffer
                } else {
                    // Regular character outside quotes
                    currentField.append(c);
                }
            }
        }

        // Don't forget the last field (no trailing comma)
        fields.add(currentField.toString().trim());

        // Safety check: if we're still inside quotes, the line is malformed
        if (inQuotes) {
            System.err.println("WARNING: Malformed CSV line (unclosed quote): " + line);
            return null;
        }

        return fields.toArray(new String[0]);
    }

    /**
     * Extract the release year from a movie title string.
     * 
     * MovieLens stores the year in parentheses at the end of the title:
     *   "Toy Story (1995)" → "1995"
     * 
     * @param title The movie title string
     * @return The year as a string, or "Unknown" if no year is found
     */
    public static String extractYear(String title) {
        if (title == null || title.isEmpty()) {
            return "Unknown";
        }

        Matcher matcher = YEAR_PATTERN.matcher(title.trim());
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "Unknown";
    }

    /**
     * Check if a CSV line is a header row (should be skipped during processing).
     * 
     * The MovieLens dataset files have headers:
     *   - ratings.csv: "userId,movieId,rating,timestamp"
     *   - movies.csv:  "movieId,title,genres"
     * 
     * @param line The CSV line to check
     * @return true if this line is a header and should be skipped
     */
    public static boolean isHeader(String line) {
        if (line == null) return true;
        String lower = line.trim().toLowerCase();
        return lower.startsWith("userid") || lower.startsWith("movieid");
    }
}
