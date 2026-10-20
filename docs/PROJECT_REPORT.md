# CineMetrics: Movie Ratings Analysis Using Apache Hadoop MapReduce
## College Big Data Analytics Project Report

**Institution:** SRM Institute of Science and Technology, Ramapuram  
**Course:** Big Data Essentials (21CSC314P)  
**Degree:** Bachelor of Technology in Information Technology  
**Student Developer:** Achyuth PV  
**Academic Year:** 2025–2026  

---

## 1. ABSTRACT

Modern digital entertainment platforms generate immense volumes of user interaction data daily. Analyzing user viewing behavior and review sentiment requires distributed data processing frameworks capable of operating on massive datasets across clusters of commodity hardware. This project presents **CineMetrics**, an end-to-end Big Data analytics platform that processes the GroupLens MovieLens dataset using **Apache Hadoop MapReduce** running on the **Hadoop Distributed File System (HDFS)** with **YARN** resource management. 

Seven distinct MapReduce jobs were designed and implemented in Java, addressing core analytical questions: calculating average movie ratings, computing audience engagement counts, determining half-star rating distributions, executing map-side distributed cache joins to assess genre popularity, tracking quality perceptions across release decades, discovering overlooked "hidden gems" via Bayesian weighted scoring, and evaluating audience reviewing velocity over calendar time. The output partitions are served through a high-performance **FastAPI** backend and visualized on a cinematic, dark-themed **React** intelligence dashboard.

---

## 2. INTRODUCTION

The rapid proliferation of online streaming platforms has transformed film consumption. Users generate ratings, bookmarks, and reviews at scales that overwhelm single-machine relational database management systems (RDBMS). Traditional relational databases struggle with large-scale aggregations due to vertical scaling limits, expensive row locking, and centralized disk seek bottlenecks. 

Apache Hadoop addresses these constraints through horizontal scalability, fault tolerance, and data locality. Instead of transporting petabytes of data across network switches to compute nodes, Hadoop schedules compute tasks on the exact physical machines hosting the data blocks. This project investigates and demonstrates the practical mechanics of distributed batch processing through the implementation of CineMetrics.

---

## 3. PROBLEM STATEMENT

Given a large-scale repository of movie evaluations consisting of user identifiers, movie identifiers, star ratings, and Unix timestamps, the objective is to answer ten foundational analytical questions without resorting to in-memory non-distributed single-threaded libraries:

1. Which movies achieve the highest overall average ratings?
2. Which movies have received the highest volume of audience ratings?
3. What is the exact mean rating and variance for every individual catalogue entry?
4. Which film genres dominate audience attention versus critical acclaim?
5. How are audience ratings distributed across the 0.5 to 5.0 star spectrum?
6. How have perceived cinematic quality and rating tendencies evolved across production release years?
7. How can high-quality but under-reviewed "hidden gems" be statistically differentiated from sample-size anomalies?
8. What correlation exists between rating counts and mean scores?
9. Which genres maintain the highest audience scores after multi-label tokenization?
10. What temporal patterns characterize audience review submissions across historical calendar years?

---

## 4. EXISTING SYSTEM VS. PROPOSED SYSTEM

| Parameter | Existing Traditional System | Proposed CineMetrics Hadoop System |
| :--- | :--- | :--- |
| **Architecture** | Centralized Single-Node RDBMS / In-Memory Python | Distributed Master-Worker (HDFS + YARN) |
| **Data Partitioning** | None (Single monolithic disk or vertical table) | 128MB HDFS Block Partitioning across DataNodes |
| **Execution Paradigm** | Sequential / Single-threaded iterative loops | Parallel MapReduce (Map $\to$ Shuffle & Sort $\to$ Reduce) |
| **Network Overhead** | High (Client fetches entire dataset into RAM) | Low (Data locality + In-mapper Combiners) |
| **Fault Tolerance** | Hardware RAID or single point of failure | 3x Automatic Block Replication with self-healing |
| **Join Methodology** | Nested-loop or Hash Join in RAM | Map-Side DistributedCache Join |
| **Scalability** | Limited by single-machine RAM (OOM errors) | Horizontally scalable to multi-terabyte datasets |

---

## 5. SYSTEM ARCHITECTURE

The CineMetrics platform follows an 8-stage distributed pipeline:

```
[Raw MovieLens CSVs]
         │
         ▼
  [HDFS Ingestion] (hdfs dfs -put into 128MB DataNode blocks)
         │
         ▼
 [InputSplit & Mapper] (LineRecordReader parses CSV, emits Key-Value pairs)
         │
         ▼
[Combiner Mini-Reducer] (Aggregates partial sums on map nodes to cut network I/O)
         │
         ▼
 [Shuffle & Sort Phase] (HashPartitioner routes keys, framework sorts intermediate data)
         │
         ▼
   [Hadoop Reducer] (Computes global averages, frequencies, and Bayesian scores)
         │
         ▼
 [Structured HDFS Output] (part-r-00000 TSV partitions)
         │
         ▼
  [FastAPI Backend REST] (Indexes partitions, exposes RESTful API endpoints)
         │
         ▼
[React Analytics Dashboard] (Visualizes metrics via Recharts with dark UI)
```

---

## 6. MAPREDUCE ALGORITHMS & IMPLEMENTATION

### Job 1: Average Movie Rating (`AverageRatingJob.java`)
- **Mapper:** Reads each record in `ratings.csv`. Skips header. Emits `movieId` $\to$ `(rating, 1)`.
- **Combiner:** Sums partial ratings and counts locally on mapper nodes to minimize shuffle volume. Emits `movieId` $\to$ `(partialSum, partialCount)`.
- **Reducer:** Aggregates all incoming tuples per `movieId`:
  $$\text{averageRating} = \frac{\sum \text{ratings}}{\sum \text{counts}}$$
  Emits: `movieId \t averageRating \t ratingCount`.

### Job 2: Most Rated Movies (`MostRatedJob.java`)
- **Mapper:** Emits `movieId` $\to$ `1`.
- **Combiner & Reducer:** Sums occurrence counts to calculate total rating volume per title.
- **Output:** `movieId \t totalRatings` sorted in descending order.

### Job 3: Rating Distribution (`RatingDistributionJob.java`)
- **Mapper:** Extracts rating value ($r \in \{0.5, 1.0, \dots, 5.0\}$). Emits `rating` $\to$ `1`.
- **Reducer:** Sums frequencies per half-star bucket to produce global distribution histogram.

### Job 4: Genre Popularity via Map-Side Join (`GenrePopularityJob.java`)
- **Strategy:** Map-side join utilizing Hadoop's `DistributedCache`.
- **Setup:** Mapper loads `movies.csv` into memory during `setup()` lifecycle method.
- **Map:** For each incoming rating, retrieves pipe-separated genres (e.g. `Action|Adventure`) and emits `genre` $\to$ `(movieId, rating)`.
- **Reducer:** Computes distinct movie counts, total ratings, and mean rating per genre category.

### Job 5: Release Year Ratings (`YearRatingJob.java`)
- **Mapper:** Extracts release year from movie titles via regular expression pattern `\((\d{4})\)\s*$`. Emits `year` $\to$ `(rating, 1)`.
- **Reducer:** Computes average audience rating and volume per production year.

### Job 6: Hidden Gems Discovery (`HiddenGemsJob.java`)
- **Thresholds:** Filters movies with $5 \le \text{votes} \le 50$ and $\text{rawAvg} \ge 4.0$.
- **Formula (Bayesian Weighted Rating):**
  $$\text{WR} = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$
  Where $v$ = movie rating count, $R$ = average rating, $m = 10$ (minimum vote damping threshold), and $C = 3.5016$ (global dataset average).

### Job 7: Rating Trends Over Time (`RatingTrendsJob.java`)
- **Mapper:** Converts Unix epoch timestamp to `YYYY-MM`. Emits `yearMonth` $\to$ `(rating, 1)`.
- **Reducer:** Computes monthly review velocity and score fluctuations.

---

## 7. EXPERIMENTAL RESULTS & DISCUSSION

Executing the MapReduce pipeline over the MovieLens dataset yielded the following verified statistics:

- **Total Catalogue Entries:** 9,742 movies
- **Total Rating Records Processed:** 100,836 ratings
- **Distinct Reviewers:** 610 unique users
- **Global Population Mean Rating ($C$):** 3.5016 / 5.00 stars
- **Rating Distribution Mode:** 4.0 stars (26,818 occurrences, 26.6% of all ratings)
- **Most Rated Movie:** *Forrest Gump (1994)* — 329 ratings, mean 4.16 ★
- **Most Popular Genre by Volume:** Drama (41,928 ratings) followed by Comedy (39,053 ratings)
- **Highest Rated Genre by Mean Score:** Film-Noir (3.92 ★) followed by War (3.81 ★)
- **Identified Hidden Gems:** 355 qualifying films (top gem: *Secrets & Lies (1996)*, WR: 4.11)

---

## 8. CONCLUSION & FUTURE WORK

CineMetrics successfully demonstrates how Apache Hadoop MapReduce processes multi-file semi-structured datasets in a distributed, fault-tolerant manner. By incorporating combiners, distributed cache joins, and Bayesian mathematical damping, the system avoids common pitfalls of naive big data aggregations.

Future enhancements include:
1. Migrating iterative operations to Apache Spark DAG execution.
2. Integrating Apache Kafka for real-time rating ingestion.
3. Implementing collaborative filtering matrix factorization (ALS) at scale.

---

## 9. REFERENCES

1. White, Tom. *Hadoop: The Definitive Guide (4th Edition)*. O'Reilly Media, 2015.
2. Dean, Jeffrey, and Sanjay Ghemawat. "MapReduce: Simplified Data Processing on Large Clusters." *Communications of the ACM*, 2008.
3. GroupLens Research. *MovieLens Dataset Documentation*. University of Minnesota, 2018. https://grouplens.org/datasets/movielens/
4. Apache Software Foundation. *Apache Hadoop 3.3.6 Documentation*. https://hadoop.apache.org/
