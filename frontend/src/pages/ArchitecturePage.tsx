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
    detail: 'ratings.csv (100k lines) and movies.csv (9.7k lines) with schema: userId, movieId, rating, timestamp.'
  },
  {
    step: 2,
    title: 'HDFS Ingestion',
    desc: 'Distributed Storage',
    detail: 'Files partitioned into 128MB blocks across DataNodes with metadata maintained by the NameNode.'
  },
  {
    step: 3,
    title: 'InputSplit & Mapper',
    desc: 'Parallel Parsing',
    detail: 'InputFormat splits files by line. Mapper parses CSV, validates types, and emits Key-Value pairs: (movieId, rating).'
  },
  {
    step: 4,
    title: 'Combiner (Local)',
    desc: 'Mini-Reducer',
    detail: 'Aggregates partial sums on the map node itself (e.g. sum, count) to minimize network shuffle I/O.'
  },
  {
    step: 5,
    title: 'Shuffle & Sort',
    desc: 'Network Partitioning',
    detail: 'Hadoop partitioner hashes keys to assign partitions. Framework groups all values for each key: (movieId, [r1, r2, ...]).'
  },
  {
    step: 6,
    title: 'Reducer',
    desc: 'Global Aggregation',
    detail: 'Reducer computes sum / count = averageRating. Writes result to HDFS part-r-00000 TSV output.'
  },
  {
    step: 7,
    title: 'FastAPI Backend',
    desc: 'Analytics Service',
    detail: 'Loads MapReduce part-files, indexes lookups, applies Bayesian damping, and exposes REST endpoints.'
  },
  {
    step: 8,
    title: 'React Dashboard',
    desc: 'CineMetrics UI',
    detail: 'Displays interactive charts, movie explorer, and cluster health for demonstration and viva grading.'
  }
];

const vivaQuestions = [
  {
    q: "1. What is Big Data, and how does MovieLens qualify?",
    a: "Big Data refers to datasets whose volume, velocity, and variety exceed traditional relational database processing capabilities. While MovieLens 100k is used for rapid testing, MovieLens scales to 32M+ records where single-machine memory fails, necessitating distributed file systems and batch processing frameworks like Hadoop."
  },
  {
    q: "2. What are the 5 Vs of Big Data?",
    a: "1. Volume (size of data), 2. Velocity (speed of data generation), 3. Variety (structured CSVs, unstructured text/tags), 4. Veracity (data quality, missing records, invalid timestamps), 5. Value (extracting actionable audience insights like hidden gems)."
  },
  {
    q: "3. What is the fundamental architecture of HDFS?",
    a: "HDFS uses a master-worker architecture. The NameNode (Master) manages the filesystem namespace, directory tree, and block mappings. The DataNodes (Workers) store actual data blocks (default 128MB) and execute read/write operations requested by clients."
  },
  {
    q: "4. What happens if a DataNode crashes in Hadoop?",
    a: "HDFS is fault-tolerant through block replication (default factor 3). DataNodes send periodic heartbeats to the NameNode. If heartbeats stop for 10 minutes, the NameNode marks the node dead and automatically replicates missing blocks onto healthy DataNodes from existing replicas."
  },
  {
    q: "5. What is the role of YARN in Hadoop?",
    a: "YARN (Yet Another Resource Negotiator) decouples resource management from processing. The ResourceManager allocates cluster CPU and memory, while NodeManagers run on worker nodes to monitor containers. The ApplicationMaster negotiates containers for a specific job."
  },
  {
    q: "6. Explain the Mapper phase in our AverageRatingJob.",
    a: "The Mapper reads one line of ratings.csv at a time. It uses CSVParser to extract movieId and rating, validates their types, and emits Key: movieId (IntWritable) and Value: rating (Text 'rating,1')."
  },
  {
    q: "7. Why did we use a Combiner in our MapReduce jobs?",
    a: "A Combiner runs locally on each mapper node before network transfer. Instead of emitting 100 separate ratings for Toy Story across the network, the combiner sums them to (sum=410, count=100) and emits just one record. This dramatically cuts network shuffle saturation."
  },
  {
    q: "8. Can a Combiner always be used for Average calculation?",
    a: "No! Average is NOT associative: Avg(Avg(A), Avg(B)) ≠ Avg(A, B). Therefore, the Combiner must emit (sum, count) pairs rather than averages, allowing the Reducer to correctly compute globalSum / globalCount."
  },
  {
    q: "9. How does Hadoop perform the Shuffle and Sort phase?",
    a: "Between Map and Reduce, Hadoop partitions map output keys using HashPartitioner: (hash(key) & Integer.MAX_VALUE) % numReducers. It then sorts intermediate records by key so each Reducer receives an iterator of all values belonging to its assigned keys."
  },
  {
    q: "10. How did you join movies.csv and ratings.csv in GenrePopularityJob?",
    a: "We used a Map-Side Join using Hadoop's DistributedCache. The small movies.csv (494 KB) is loaded into RAM inside the Mapper's setup() method. As ratings.csv streams through the map() method, the mapper looks up the movie's genres instantly in memory with zero shuffle overhead."
  },
  {
    q: "11. What is the difference between a Map-Side Join and a Reduce-Side Join?",
    a: "In a Map-Side Join, one dataset is small enough to fit in memory (DistributedCache), avoiding data shuffle. In a Reduce-Side Join, both large datasets are tagged and sent through the shuffle to the Reducer, which is heavier on network I/O but works for datasets of any size."
  },
  {
    q: "12. What is the Bayesian Weighted Rating formula in Job 6 (Hidden Gems)?",
    a: "WR = (v / (v + m)) * R + (m / (v + m)) * C, where v = movie rating count, R = movie average rating, m = minimum votes threshold (e.g. 10), and C = global dataset mean rating (3.50). It penalizes movies with only 1 rating of 5.0 from dominating the top rankings."
  },
  {
    q: "13. How does our project handle malformed CSV rows?",
    a: "Our CSVParser checks for proper token counts, skips the CSV header row automatically, handles quoted commas in movie titles like 'Lord of the Rings, The (2001)', and logs skipped corrupt rows to standard error without crashing the Hadoop container."
  },
  {
    q: "14. How do you distinguish movie release year from rating timestamp?",
    a: "Job 5 parses the movie title using a regular expression r'\\((\\d{4})\\)' to extract the release year. Job 7 parses the Unix epoch timestamp column in ratings.csv and converts it to YYYY-MM to track user submission activity across calendar years."
  },
  {
    q: "15. What are the key limitations of Hadoop MapReduce?",
    a: "MapReduce writes intermediate results to local disk and final results to HDFS, incurring high disk I/O. It lacks support for in-memory iterative computing (which Apache Spark solves) and is optimized for batch rather than real-time streaming."
  },
  {
    q: "16. Why does Hadoop use Data Locality?",
    a: "Moving computation to data is vastly cheaper than moving data to computation. YARN schedules map tasks on the exact DataNode physical machine where that HDFS block resides (Rack/Node local), eliminating network file transfer."
  },
  {
    q: "17. What is the difference between HDFS block size and OS block size?",
    a: "Operating system blocks are typically 4KB. HDFS blocks are 128MB or 256MB. A large block size minimizes the cost of disk seeks and reduces the memory footprint of metadata stored in the NameNode's RAM."
  },
  {
    q: "18. How did you verify that MapReduce outputs are genuine?",
    a: "We verified the output partitions (part-r-00000) generated by Hadoop against deterministic test cases and reference aggregations. The dashboard reads these exact partition files via the FastAPI backend without any fabricated random data."
  },
  {
    q: "19. What is secondary sorting in MapReduce?",
    a: "Secondary sorting allows MapReduce to sort values associated with a key before reaching the Reducer. It uses a composite key (e.g., NaturalKey + Value) and a custom Partitioner and GroupingComparator."
  },
  {
    q: "20. How would you scale CineMetrics to MovieLens 32M?",
    a: "Because our MapReduce jobs are designed with distributed partitioning, scaling to MovieLens 32M only requires increasing the HDFS cluster storage and YARN worker containers. The Java algorithms remain unchanged."
  }
];

export default function ArchitecturePage() {
  const [activeStep, setActiveStep] = useState<number>(3);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-[#252538]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              System Architecture & Viva Examination Guide
              <span className="text-xs px-2.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
                SRM IST 21CSC314P
              </span>
            </h2>
            <p className="text-xs text-[#9aa0b8] mt-1">
              Comprehensive explanation of distributed processing, MapReduce internals, and academic defense questions.
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="text-[#646a84]">Student Developer:</span>
            <p className="text-white font-semibold">Achyuth PV (SRM Ramapuram)</p>
          </div>
        </div>
      </div>

      {/* 8-Stage Pipeline Interactive Flowchart */}
      <div className="rounded-xl bg-[#161622] border border-[#252538] p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-violet-400" />
            End-to-End Hadoop Distributed Pipeline (Click any stage to inspect)
          </h3>
          <p className="text-xs text-[#9aa0b8] mt-0.5">
            Traces the complete lifecycle of movie ratings from raw CSV ingestion to frontend intelligence.
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
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-violet-600/20 border-violet-500 shadow-md shadow-violet-600/20'
                    : 'bg-[#0d0d14] border-[#252538] hover:border-[#3b3b58]'
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-violet-400 block mb-1">
                  STAGE 0{stage.step}
                </span>
                <p className="text-xs font-bold text-white leading-tight truncate">{stage.title}</p>
                <p className="text-[10px] text-[#646a84] mt-1 truncate">{stage.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail Inspector */}
        <div className="rounded-xl bg-[#0d0d14] border border-violet-500/30 p-4 animate-fade-in">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-bold font-mono uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Deep Dive: Stage {activeStep} — {pipelineStages[activeStep - 1].title} ({pipelineStages[activeStep - 1].desc})</span>
          </div>
          <p className="text-xs text-[#f1f1f8] mt-2 leading-relaxed">
            {pipelineStages[activeStep - 1].detail}
          </p>
        </div>
      </div>

      {/* Worked Numerical Example for Viva */}
      <div className="rounded-xl bg-[#161622] border border-[#252538] p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Worked MapReduce Numerical Example (5 Movie Ratings)
          </h3>
          <p className="text-xs text-[#9aa0b8] mt-0.5">
            Step-by-step mathematical trace to explain how average rating calculation works in a viva examination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          {/* Step A: Raw Input */}
          <div className="rounded-xl bg-[#0d0d14] border border-[#252538] p-4 space-y-2">
            <span className="text-[10px] text-[#646a84] uppercase font-bold tracking-wider block">
              1. Input Records (ratings.csv)
            </span>
            <div className="space-y-1 text-[#9aa0b8] text-[11px]">
              <p>User 1, Movie 1 → <strong className="text-white">4.0 ★</strong></p>
              <p>User 2, Movie 1 → <strong className="text-white">5.0 ★</strong></p>
              <p>User 3, Movie 2 → <strong className="text-white">3.0 ★</strong></p>
              <p>User 4, Movie 1 → <strong className="text-white">4.5 ★</strong></p>
              <p>User 5, Movie 2 → <strong className="text-white">4.0 ★</strong></p>
            </div>
          </div>

          {/* Step B: Map Phase */}
          <div className="rounded-xl bg-[#0d0d14] border border-[#252538] p-4 space-y-2">
            <span className="text-[10px] text-violet-400 uppercase font-bold tracking-wider block">
              2. Mapper Emit (Key → Val)
            </span>
            <div className="space-y-1 text-violet-300 text-[11px]">
              <p>1 → (4.0, 1)</p>
              <p>1 → (5.0, 1)</p>
              <p>2 → (3.0, 1)</p>
              <p>1 → (4.5, 1)</p>
              <p>2 → (4.0, 1)</p>
            </div>
          </div>

          {/* Step C: Shuffle & Sort */}
          <div className="rounded-xl bg-[#0d0d14] border border-[#252538] p-4 space-y-2">
            <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">
              3. Shuffle & Group by Key
            </span>
            <div className="space-y-2 text-blue-300 text-[11px]">
              <p>Key 1: [(4.0, 1), (5.0, 1), (4.5, 1)]</p>
              <p>Key 2: [(3.0, 1), (4.0, 1)]</p>
            </div>
          </div>

          {/* Step D: Reducer */}
          <div className="rounded-xl bg-[#0d0d14] border border-emerald-500/30 p-4 space-y-2">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
              4. Reducer Final Output
            </span>
            <div className="space-y-2 text-emerald-300 text-[11px]">
              <div>
                <p className="font-bold text-white">Movie 1: Avg 4.50 ★</p>
                <p className="text-[10px] text-[#646a84]">Sum: 13.5 / Count: 3</p>
              </div>
              <div>
                <p className="font-bold text-white">Movie 2: Avg 3.50 ★</p>
                <p className="text-[10px] text-[#646a84]">Sum: 7.0 / Count: 2</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Academic Theory Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-[#161622] border border-[#252538] p-5 space-y-3">
          <div className="flex items-center gap-2 text-violet-400">
            <Database className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">The 5 Vs of Big Data</h4>
          </div>
          <ul className="text-xs text-[#9aa0b8] space-y-2 leading-relaxed">
            <li><strong className="text-white">Volume:</strong> 100k to 32M+ rating rows.</li>
            <li><strong className="text-white">Velocity:</strong> High-throughput streaming reviews.</li>
            <li><strong className="text-white">Variety:</strong> Structured CSV, user free-text tags.</li>
            <li><strong className="text-white">Veracity:</strong> Handling corrupted ratings and timestamps.</li>
            <li><strong className="text-white">Value:</strong> Discovering high-quality hidden gems.</li>
          </ul>
        </div>

        <div className="rounded-xl bg-[#161622] border border-[#252538] p-5 space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <HardDrive className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">HDFS Storage Model</h4>
          </div>
          <ul className="text-xs text-[#9aa0b8] space-y-2 leading-relaxed">
            <li><strong className="text-white">NameNode:</strong> Master memory-resident inode tree.</li>
            <li><strong className="text-white">DataNodes:</strong> Block storage daemons on commodity disk.</li>
            <li><strong className="text-white">Block Size:</strong> Default 128MB to optimize disk seek latency.</li>
            <li><strong className="text-white">Replication:</strong> 3x redundancy across failure domains.</li>
          </ul>
        </div>

        <div className="rounded-xl bg-[#161622] border border-[#252538] p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Cpu className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">YARN Execution Architecture</h4>
          </div>
          <ul className="text-xs text-[#9aa0b8] space-y-2 leading-relaxed">
            <li><strong className="text-white">ResourceManager:</strong> Arbitrates global compute resources.</li>
            <li><strong className="text-white">NodeManager:</strong> Manages localized container lifecycles.</li>
            <li><strong className="text-white">ApplicationMaster:</strong> Negotiates containers per job.</li>
            <li><strong className="text-white">Data Locality:</strong> Executes mappers on data block hosts.</li>
          </ul>
        </div>
      </div>

      {/* College Viva Examination Q&A Section */}
      <div className="rounded-xl bg-[#161622] border border-[#252538] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <BookOpen className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">
              20 Most Likely Viva Questions & Answers (for Achyuth PV)
            </h3>
          </div>
          <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Exam Ready
          </span>
        </div>

        <p className="text-xs text-[#9aa0b8]">
          Click any question to view the technical answer formulated for your college project grading.
        </p>

        <div className="space-y-2 pt-2">
          {vivaQuestions.map((item, idx) => {
            const isExpanded = expandedQ === idx;
            return (
              <div
                key={idx}
                className="rounded-lg bg-[#0d0d14] border border-[#252538] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedQ(isExpanded ? null : idx)}
                  className="w-full p-3.5 text-left flex items-center justify-between text-xs font-semibold text-white hover:text-violet-300 transition-colors"
                >
                  <span className="pr-4">{item.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-violet-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#646a84] shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 text-xs text-[#9aa0b8] leading-relaxed border-t border-[#252538]/60 pt-2.5 bg-[#12121c]/40 animate-fade-in">
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
