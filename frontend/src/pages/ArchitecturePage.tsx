import React, { useState } from 'react';
import {
  GitBranch,
  Database,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Award,
  Network
} from 'lucide-react';

const pipelineStages = [
  {
    step: 1,
    title: 'MovieLens CSV',
    desc: 'Raw Data Source',
    detail: 'ratings.csv (100,836 rows) and movies.csv (9,742 rows) with schema: userId, movieId, rating, timestamp.'
  },
  {
    step: 2,
    title: 'HDFS Ingestion',
    desc: 'Distributed Storage',
    detail: 'Raw CSVs uploaded into HDFS directory /cinemetrics/input with 128MB block partitions managed by the NameNode.'
  },
  {
    step: 3,
    title: 'InputSplit & Mapper',
    desc: 'Parallel Parsing',
    detail: 'TextInputFormat creates splits line-by-line. The Mapper parses tokens, validates half-star values, and emits (movieId, rating).'
  },
  {
    step: 4,
    title: 'Combiner (Local)',
    desc: 'Mini-Reducer',
    detail: 'Aggregates partial sums on the map worker node before shuffle, emitting (partialSum, partialCount) to minimize network I/O.'
  },
  {
    step: 5,
    title: 'Shuffle & Sort',
    desc: 'Network Partitioning',
    detail: 'HashPartitioner routes intermediate keys across reducers. The framework groups values: (movieId, [partialSums...]).'
  },
  {
    step: 6,
    title: 'Reducer',
    desc: 'Global Aggregation',
    detail: 'Reducer accumulates all partial sums and counts, computes exact average = sum / count, and writes part-r-00000 TSV files.'
  },
  {
    step: 7,
    title: 'FastAPI Backend',
    desc: 'Analytics Service',
    detail: 'Loads all partition files into memory, caches indices, computes Bayesian weighted scores, and serves OpenAPI endpoints.'
  },
  {
    step: 8,
    title: 'React Dashboard',
    desc: 'CineMetrics UI',
    detail: 'Renders interactive visualizations, movie explorer, side-by-side comparison, and cluster telemetry for viva evaluation.'
  }
];

const vivaQuestions = [
  {
    q: "1. What is Big Data, and how does the MovieLens analytics task qualify?",
    a: "Big Data refers to datasets whose volume, velocity, and variety exceed traditional single-node database processing capabilities. While MovieLens Latest-Small (100k ratings) allows rapid development and testing, the MovieLens architecture scales to 32M+ ratings (over 1 GB compressed). At that scale, single-machine in-memory processing becomes a bottleneck, necessitating distributed storage (HDFS) and distributed parallel processing (Hadoop MapReduce)."
  },
  {
    q: "2. What are the 5 Vs of Big Data in the context of CineMetrics?",
    a: "1. Volume: 100,836 ratings scaling to 32M records. 2. Velocity: Continuous stream of user ratings and reviews over time. 3. Variety: Structured tabular CSVs, pipe-delimited multi-label genres, and unstructured free-text user tags. 4. Veracity: Handling corrupt records, unrated films, missing release years, and trailing commas. 5. Value: Discovering audience sentiment, identifying overlooked hidden gems, and computing fair Bayesian rankings."
  },
  {
    q: "3. What is the fundamental master-worker architecture of HDFS?",
    a: "HDFS uses a master-worker design. The NameNode acts as the master daemon, maintaining the filesystem namespace, directory tree, and the mapping of file blocks to DataNodes entirely in memory (persisted via fsimage and edits log). The DataNodes are worker daemons running on commodity hardware that store actual 128MB block replicas and execute block read/write operations."
  },
  {
    q: "4. What happens if a DataNode crashes in our Hadoop cluster?",
    a: "HDFS is fault-tolerant through block replication (default replication factor = 3). DataNodes send periodic heartbeats (default every 3 seconds) to the NameNode. If heartbeats cease for 10 minutes, the NameNode marks that DataNode as dead. The NameNode inspects its block map, identifies under-replicated blocks, and automatically commands healthy DataNodes to replicate those blocks to restore the replication factor."
  },
  {
    q: "5. What is the role of YARN in Apache Hadoop 3.x?",
    a: "YARN (Yet Another Resource Negotiator) decouples cluster resource management from the MapReduce processing model. The central ResourceManager allocates cluster-wide CPU cores and RAM memory. On each worker node, a NodeManager monitors container resource consumption. When a job is submitted, an ApplicationMaster container is launched to negotiate resources with the ResourceManager and supervise task execution."
  },
  {
    q: "6. Explain the Mapper implementation in Job 1 (AverageMovieRating).",
    a: "In AverageRatingJob.java, the Mapper extends Mapper<LongWritable, Text, IntWritable, Text>. It reads each line of ratings.csv, skips the header row, parses the CSV tokens with CSVParser, extracts movieId and rating, and emits Key: movieId (IntWritable) and Value: 'rating,1' (Text). It handles malformed lines gracefully by logging to standard error without failing the container."
  },
  {
    q: "7. Why did we implement a Combiner in our MapReduce jobs?",
    a: "A Combiner acts as a localized 'mini-reducer' that runs on the mapper node prior to the network shuffle phase. If Movie 1 receives 1,000 ratings on a single mapper split, emitting 1,000 individual pairs across the network would choke the network switch. The Combiner aggregates them into a single intermediate pair (sum=4120.0, count=1000), reducing network shuffle traffic by over 95%."
  },
  {
    q: "8. Can a Combiner compute average directly? Why or why not?",
    a: "No! The arithmetic mean is NOT an associative or commutative aggregation: Avg(Avg(A), Avg(B)) ≠ Avg(A, B) when sample sizes differ. If Combiner 1 averages 2 ratings (mean 4.0) and Combiner 2 averages 8 ratings (mean 2.0), averaging (4.0 + 2.0)/2 yields 3.0, whereas the true average is (8 + 16)/10 = 2.40. Therefore, the Combiner MUST emit (sum, count) pairs, allowing the Reducer to compute totalSum / totalCount."
  },
  {
    q: "9. How does Hadoop perform the Shuffle and Sort phase between Mapper and Reducer?",
    a: "After the Map phase, Hadoop uses HashPartitioner to determine which Reducer processes which key: (hash(key) & Integer.MAX_VALUE) % numReducers. Intermediate pairs are written to a ring buffer in RAM (default 100MB) and spilled to disk sorted by key. During the merge/sort step, all values for a given key are merged so that each Reducer receives a key and an Iterable of all values for that key."
  },
  {
    q: "10. How did you join movies.csv with ratings.csv in Job 4 (GenrePopularity)?",
    a: "We implemented a Map-Side Join using Hadoop's DistributedCache. Because movies.csv is small (494 KB), it is distributed to all worker nodes via Job.addCacheFile(). In the Mapper's setup() method, movies.csv is read into a Java HashMap in memory. When ratings.csv is processed in the map() method, the mapper looks up the movie's title and genres in RAM in O(1) time with ZERO network shuffle cost."
  },
  {
    q: "11. What is the difference between a Map-Side Join and a Reduce-Side Join?",
    a: "In a Map-Side Join, at least one dataset is small enough to fit in mapper memory (DistributedCache), avoiding data shuffle entirely. In a Reduce-Side Join, both large datasets are tagged with their source in the Mapper, sent across the network through the shuffle phase, and joined inside the Reducer. Reduce-Side Join is heavier on network I/O but works for datasets of arbitrary size."
  },
  {
    q: "12. What is the Bayesian Weighted Rating formula used in Job 6 (Hidden Gems)?",
    a: "WR = (v / (v + m)) * R + (m / (v + m)) * C, where v = movie rating count, R = movie average rating, m = minimum votes threshold (10), and C = global dataset mean rating (3.50 ★). It prevents movies with only 1 or 2 perfect reviews from unfairly outranking well-established cinema classics with hundreds of ratings."
  },
  {
    q: "13. How does our Hadoop pipeline handle malformed CSV rows?",
    a: "Our Java CSVParser correctly handles quoted commas in movie titles (e.g., 'Lord of the Rings, The (2001)'), verifies that the line contains the required number of columns, checks for numeric parsing errors, skips empty lines, and ignores the CSV header row. Malformed rows increment a Hadoop Counter and log a warning without terminating the job."
  },
  {
    q: "14. How do you distinguish movie release year from the rating timestamp?",
    a: "Job 5 parses the movie title using a regular expression r'\\((\\d{4})\\)' to extract the theatrical release year (e.g. 1995 for Toy Story). Job 7 parses the Unix epoch timestamp column (e.g. 964982703) in ratings.csv and converts it to YYYY-MM to track platform reviewing activity across calendar years (1996–2018)."
  },
  {
    q: "15. What are the main limitations of Hadoop MapReduce?",
    a: "1. High Disk I/O: MapReduce spills intermediate records to local disk and writes final output to HDFS. 2. Lack of in-memory caching: Iterative algorithms (e.g., machine learning) must reload data from disk on every iteration (which Apache Spark solves). 3. High startup latency: JVM startup and container allocation make MapReduce unsuitable for interactive real-time queries."
  },
  {
    q: "16. Why is Data Locality fundamental to Hadoop's performance?",
    a: "In big data systems, moving computation to data is vastly faster and cheaper than moving data to computation over the network. YARN schedules map tasks directly on the DataNode physical machine where that HDFS block resides (Rack/Node Locality), achieving maximum read throughput from local disk."
  },
  {
    q: "17. What is the difference between HDFS block size and OS block size?",
    a: "Operating system blocks are typically 4KB (optimized for small files and random I/O). HDFS blocks are 128MB or 256MB. A large block size amortizes disk seek time over a large sequential read and minimizes the memory footprint of metadata stored in the NameNode's RAM (each block consumes ~150 bytes in NameNode memory)."
  },
  {
    q: "18. How did you verify that MapReduce outputs are genuine?",
    a: "All 7 MapReduce jobs compile to a verified Uber-JAR (cinemetrics-mapreduce-1.0.0.jar) using Maven. We verified the output partition files (part-r-00000) against deterministic unit tests (MapReduceUnitTest.java). The CineMetrics dashboard directly reads these exact partition files via the FastAPI data_loader."
  },
  {
    q: "19. What is secondary sorting in MapReduce?",
    a: "Secondary sorting allows MapReduce to sort the values associated with a key before they reach the Reducer. It is achieved by creating a composite key (e.g., NaturalKey + SecondaryValue), implementing a custom Partitioner (which hashes only the NaturalKey), and writing a GroupingComparator (which groups by NaturalKey)."
  },
  {
    q: "20. How would you scale CineMetrics from MovieLens 100K to MovieLens 32M?",
    a: "Because our MapReduce jobs are designed with distributed partitioning, scaling to MovieLens 32M requires zero code changes. We upload the 32M CSV to HDFS, increase the number of YARN worker containers, set numReduceTasks proportionally (e.g., 10–20 reducers), and submit the existing Uber-JAR to the cluster."
  }
];

export default function ArchitecturePage() {
  const [activeStep, setActiveStep] = useState<number>(3);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div className="pb-4 border-b border-[#282A30]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
                System Architecture & Viva Defense
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F4B860]/10 text-[#F4B860] border border-[#F4B860]/30 font-mono font-medium">
                SRM IST 21CSC314P
              </span>
            </div>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Internal mechanics of Hadoop distributed processing, MapReduce execution lifecycle, and viva examination defense.
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="text-[#A1A1AA]">Student Developer:</span>
            <p className="text-[#F4F4F5] font-semibold">Achyuth PV (SRM Ramapuram)</p>
          </div>
        </div>
      </div>

      {/* 8-Stage Pipeline Interactive Flowchart */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-sm font-bold text-[#F4F4F5] flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#F4B860]" />
            End-to-End Hadoop Distributed Pipeline (Click any stage to inspect internals)
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Traces the complete lifecycle of movie ratings from raw CSV ingestion to React analytical visualization.
          </p>
        </div>

        {/* Pipeline Steps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {pipelineStages.map((stage) => {
            const isSelected = activeStep === stage.step;
            return (
              <button
                key={stage.step}
                onClick={() => setActiveStep(stage.step)}
                className={`p-3 rounded-xl border text-left transition-standard ${
                  isSelected
                    ? 'bg-[#F4B860]/10 border-[#F4B860] shadow-sm'
                    : 'bg-[#14161B] border-[#282A30] hover:border-[#3A3D46]'
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-[#F4B860] block mb-1">
                  STAGE 0{stage.step}
                </span>
                <p className="text-xs font-bold text-[#F4F4F5] leading-tight truncate">{stage.title}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-1 truncate">{stage.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail Inspector */}
        <div className="rounded-xl bg-[#14161B] border border-[#F4B860]/30 p-4 animate-fade-in">
          <div className="flex items-center gap-2 text-[#F4B860] text-xs font-bold font-mono uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Deep Dive: Stage {activeStep} — {pipelineStages[activeStep - 1].title} ({pipelineStages[activeStep - 1].desc})</span>
          </div>
          <p className="text-xs text-[#F4F4F5] mt-2 leading-relaxed">
            {pipelineStages[activeStep - 1].detail}
          </p>
        </div>
      </div>

      {/* Worked Numerical Example for Viva Voce */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-sm font-bold text-[#F4F4F5] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2DD4BF]" />
            Worked MapReduce Numerical Trace (5 Movie Ratings)
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Step-by-step mathematical trace demonstrating exact data transformation through Map, Shuffle, and Reduce.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          {/* Step A: Raw Input */}
          <div className="rounded-xl bg-[#14161B] border border-[#282A30] p-4 space-y-2">
            <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider block">
              1. Input Records (ratings.csv)
            </span>
            <div className="space-y-1 text-[#A1A1AA] text-[11px]">
              <p>User 1, Movie 1 → <strong className="text-[#F4F4F5]">4.0 ★</strong></p>
              <p>User 2, Movie 1 → <strong className="text-[#F4F4F5]">5.0 ★</strong></p>
              <p>User 3, Movie 2 → <strong className="text-[#F4F4F5]">3.0 ★</strong></p>
              <p>User 4, Movie 1 → <strong className="text-[#F4F4F5]">4.5 ★</strong></p>
              <p>User 5, Movie 2 → <strong className="text-[#F4F4F5]">4.0 ★</strong></p>
            </div>
          </div>

          {/* Step B: Map Phase */}
          <div className="rounded-xl bg-[#14161B] border border-[#282A30] p-4 space-y-2">
            <span className="text-[10px] text-[#F4B860] uppercase font-bold tracking-wider block">
              2. Mapper Emit (Key → Val)
            </span>
            <div className="space-y-1 text-[#F4B860] text-[11px]">
              <p>1 → (4.0, 1)</p>
              <p>1 → (5.0, 1)</p>
              <p>2 → (3.0, 1)</p>
              <p>1 → (4.5, 1)</p>
              <p>2 → (4.0, 1)</p>
            </div>
          </div>

          {/* Step C: Shuffle & Sort */}
          <div className="rounded-xl bg-[#14161B] border border-[#282A30] p-4 space-y-2">
            <span className="text-[10px] text-[#2DD4BF] uppercase font-bold tracking-wider block">
              3. Shuffle & Group by Key
            </span>
            <div className="space-y-2 text-[#2DD4BF] text-[11px]">
              <p>Key 1: [(4.0, 1), (5.0, 1), (4.5, 1)]</p>
              <p>Key 2: [(3.0, 1), (4.0, 1)]</p>
            </div>
          </div>

          {/* Step D: Reducer */}
          <div className="rounded-xl bg-[#14161B] border border-emerald-500/30 p-4 space-y-2">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
              4. Reducer Final Output
            </span>
            <div className="space-y-2 text-emerald-300 text-[11px]">
              <div>
                <p className="font-bold text-[#F4F4F5]">Movie 1: Avg 4.50 ★</p>
                <p className="text-[10px] text-[#A1A1AA]">Sum: 13.5 / Count: 3</p>
              </div>
              <div>
                <p className="font-bold text-[#F4F4F5]">Movie 2: Avg 3.50 ★</p>
                <p className="text-[10px] text-[#A1A1AA]">Sum: 7.0 / Count: 2</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Academic Theory Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#F4B860]">
            <Database className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">The 5 Vs of Big Data</h3>
          </div>
          <ul className="text-xs text-[#A1A1AA] space-y-2 leading-relaxed">
            <li><strong className="text-[#F4F4F5]">Volume:</strong> 100k to 32M+ rating rows.</li>
            <li><strong className="text-[#F4F4F5]">Velocity:</strong> High-throughput streaming reviews.</li>
            <li><strong className="text-[#F4F4F5]">Variety:</strong> Structured CSVs, user free-text tags.</li>
            <li><strong className="text-[#F4F4F5]">Veracity:</strong> Handling corrupted ratings and timestamps.</li>
            <li><strong className="text-[#F4F4F5]">Value:</strong> Discovering high-quality hidden gems.</li>
          </ul>
        </div>

        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#2DD4BF]">
            <HardDrive className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">HDFS Storage Model</h3>
          </div>
          <ul className="text-xs text-[#A1A1AA] space-y-2 leading-relaxed">
            <li><strong className="text-[#F4F4F5]">NameNode:</strong> Master memory-resident inode tree.</li>
            <li><strong className="text-[#F4F4F5]">DataNodes:</strong> Block storage daemons on commodity disk.</li>
            <li><strong className="text-[#F4F4F5]">Block Size:</strong> Default 128MB to optimize disk seek latency.</li>
            <li><strong className="text-[#F4F4F5]">Replication:</strong> 3x redundancy across failure domains.</li>
          </ul>
        </div>

        <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#F4B860]">
            <Cpu className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">YARN Execution Architecture</h3>
          </div>
          <ul className="text-xs text-[#A1A1AA] space-y-2 leading-relaxed">
            <li><strong className="text-[#F4F4F5]">ResourceManager:</strong> Arbitrates global compute resources.</li>
            <li><strong className="text-[#F4F4F5]">NodeManager:</strong> Manages localized container lifecycles.</li>
            <li><strong className="text-[#F4F4F5]">ApplicationMaster:</strong> Negotiates containers per job.</li>
            <li><strong className="text-[#F4F4F5]">Data Locality:</strong> Executes mappers on data block hosts.</li>
          </ul>
        </div>
      </div>

      {/* College Viva Examination Q&A Accordion */}
      <div className="rounded-xl bg-[#191B20] border border-[#282A30] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#F4B860]">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-sm font-bold text-[#F4F4F5]">
              20 Most Likely Viva Questions & Answers (for Achyuth PV)
            </h2>
          </div>
          <span className="text-xs font-mono text-[#F4B860] bg-[#F4B860]/10 px-2 py-0.5 rounded border border-[#F4B860]/20 self-start sm:self-auto">
            Exam Ready
          </span>
        </div>

        <p className="text-xs text-[#A1A1AA]">
          Click any question to view the technical answer formulated for your university project viva voce.
        </p>

        <div className="space-y-2 pt-2">
          {vivaQuestions.map((item, idx) => {
            const isExpanded = expandedQ === idx;
            return (
              <div
                key={idx}
                className="rounded-lg bg-[#14161B] border border-[#282A30] overflow-hidden transition-standard"
              >
                <button
                  onClick={() => setExpandedQ(isExpanded ? null : idx)}
                  className="w-full p-3.5 text-left flex items-center justify-between text-xs font-semibold text-[#F4F4F5] hover:text-[#F4B860] transition-colors"
                >
                  <span className="pr-4">{item.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#F4B860] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 text-xs text-[#A1A1AA] leading-relaxed border-t border-[#282A30] pt-2.5 bg-[#101114] animate-fade-in">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
