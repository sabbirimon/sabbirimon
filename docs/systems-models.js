// Each case is a local model with explicit units and an observable outcome.
export const scenarios = [
  {id:'network-subnet', chapter:'Networking · CCNA foundations', title:'Size an IPv4 subnet', control:'IPv4 prefix length', min:24, max:30, initial:24, target:26, unit:'usable addresses',
    brief:'A classroom needs fifty host addresses. Move from /24 to /26 and predict how many usable addresses remain in a conventional broadcast subnet.',
    study:'IPv4 addresses have 32 bits. The prefix fixes the network bits. The remaining bits select hosts. Reserve the first and last addresses for the network and broadcast.',
    formula:'Usable hosts = 2 ** (32 − prefix) − 2', value:p=>2**(32-p)-2, visual:p=>Array.from({length:32},(_,i)=>i<p?'network':'host'), legend:'Blue bits identify the network. Gold bits identify hosts.'},
  {id:'network-switch', chapter:'Networking · CCNA foundations', title:'Divide a switch into VLANs', control:'Ports assigned to the lab VLAN', min:2,max:12,initial:3,target:8,unit:'recipient ports',
    brief:'A switch has twelve connected access ports. One device broadcasts. Predict the number of other lab ports receiving the frame when eight ports share its VLAN.',
    study:'A broadcast stays in the originating VLAN. The ingress port already supplied the frame. Assume all ports are forwarding and there are no trunks.',
    formula:'Recipients = active ports in the VLAN − 1',value:n=>n-1,visual:n=>Array.from({length:12},(_,i)=>i===0?'source':i<n?'host':'off'),legend:'Green is the sender. Gold ports receive its broadcast.'},
  {id:'support-memory',chapter:'Device support · A+ foundations',title:'Diagnose memory pressure',control:'Installed memory (GiB)',min:4,max:16,initial:4,target:8,unit:'GiB over capacity',
    brief:'An OS uses 3 GiB and a workload needs 7 GiB. Predict the shortfall with 8 GiB installed. Then increase memory and observe where the shortfall ends.',
    study:'Compare the working set with installed memory. A shortfall suggests investigating paging. CPU usage and disk activity are other observations to collect before replacing parts.',
    formula:'Shortfall = max(0, 10 − installed GiB)',value:n=>Math.max(0,10-n),visual:n=>Array.from({length:Math.max(n,10)},(_,i)=>i>=n?'alert':i<10?'network':'off'),legend:'Each cell is one GiB. Red shows unmet demand.'},
  {id:'support-storage',chapter:'Device support · A+ foundations',title:'Plan a recovery image',control:'Free space (GiB)',min:10,max:50,initial:15,target:30,unit:'complete images',
    brief:'A workstation needs a 12 GiB recovery image. Predict how many whole images fit in 30 GiB, then test the next capacity threshold.',
    study:'A partially written image cannot restore a device. Count whole images and leave room for verification. Test a restore on a spare device.',
    formula:'Complete images = floor(free space / 12)',value:n=>Math.floor(n/12),visual:n=>Array.from({length:n},(_,i)=>i<12*Math.floor(n/12)?'network':'off'),legend:'Each square is one GiB. Blue squares belong to complete images.'},
  {id:'system-queue',chapter:'System design',title:'Drain a worker queue',control:'Workers',min:1,max:8,initial:1,target:3,unit:'jobs left',
    brief:'Start a one-second window with 15 queued jobs. Twelve more arrive, and each worker can finish six. Predict the remaining backlog with three workers.',
    study:'Track the initial queue, arrivals and service capacity separately. A fourth worker may reduce backlog; an empty queue cannot become negative.',
    formula:'Backlog = max(0, 15 + 12 − 6 × workers)',value:n=>Math.max(0,27-6*n),visual:n=>Array.from({length:27},(_,i)=>i<6*n?'network':'host'),legend:'Blue jobs were served. Gold jobs remain in the queue.'},
  {id:'system-cache',chapter:'System design',title:'Measure cache misses',control:'Cache hits per 100 reads',min:0,max:100,initial:50,target:85,unit:'origin reads',
    brief:'Serve 100 independent reads through a cache. Predict the database reads if 85 are cache hits. Assume a single origin read per miss.',
    study:'A cache hit avoids an origin read. Observe how falling hit rates increase database load even when visitor traffic stays constant.',
    formula:'Origin reads = requests − cache hits',value:n=>100-n,visual:n=>Array.from({length:100},(_,i)=>i<n?'network':'host'),legend:'Blue reads are handled in the cache. Gold reads reach the origin.'},
  {id:'cloud-runtime',chapter:'Cloud usage',title:'Budget a compute workload',control:'Running instances',min:1,max:12,initial:2,target:5,unit:'instance-hours',
    brief:'A job runs for six hours. Predict the usage meter for five identical instances, then compare it with a smaller deployment.',
    study:'Instance-hours measure resource use. A provider price would convert that quantity into money. Stopping unused instances reduces compute hours. Storage can still accrue separately.',
    formula:'Instance-hours = running instances × hours',value:n=>n*6,visual:n=>Array.from({length:n*6},()=>'network'),legend:'Each square represents one instance running for one hour.'},
  {id:'cloud-retention',chapter:'Cloud usage',title:'Size a backup retention window',control:'Daily copies retained',min:1,max:14,initial:2,target:7,unit:'GiB stored',
    brief:'A bucket keeps one full 4 GiB backup per day. Predict steady-state storage for seven daily copies, with no deduplication or compression.',
    study:'A retention policy deletes older copies after the stated window. Shortening the window reduces storage and also reduces the number of dates available for recovery.',
    formula:'Stored GiB = size of one copy × retained copies',value:n=>4*n,visual:n=>Array.from({length:n*4},()=>'network'),legend:'Each square is one GiB. Four squares make a daily backup.'},
  {id:'defense-updates',chapter:'Defensive cybersecurity',title:'Prioritize an update rollout',control:'Devices updated',min:0,max:24,initial:6,target:18,unit:'devices still pending',
    brief:'A fleet inventory lists 24 devices needing an approved update. Predict how many still need the update after deployment succeeds on 18.',
    study:'Stage updates on a pilot group, verify versions, and track the remaining inventory. An installation request alone does not confirm an update succeeded.',
    formula:'Pending devices = eligible inventory − verified updates',value:n=>24-n,visual:n=>Array.from({length:24},(_,i)=>i<n?'source':'host'),legend:'Green devices have verified updates. Gold devices still need attention.'},
  {id:'defense-restore',chapter:'Defensive cybersecurity',title:'Test a recovery point objective',control:'Hours between backup snapshots',min:1,max:12,initial:6,target:4,unit:'records at risk',
    brief:'A service writes ten records per hour. Estimate the worst-case records since the last successful snapshot when snapshots are four hours apart.',
    study:'Recovery point objective measures tolerable data loss in time. Recovery time objective measures downtime. Validate backups with a restore test and include failed backup jobs in an operational review.',
    formula:'Worst-case records since backup = write rate × interval',value:n=>10*n,visual:n=>Array.from({length:n},()=>'host'),legend:'Each gold block is one hour of writes since a snapshot.'},
  {id:'signals-lsb',chapter:'Digital signals',title:'Read the least significant bit',control:'Unsigned 8-bit sample',min:0,max:255,initial:42,target:173,unit:'LSB value',
    brief:'Read the eight-bit representation of sample 173. Predict the value of its rightmost bit. Compare with 172.',
    study:'The rightmost binary digit has weight one. Even numbers end in zero and odd numbers end in one. Changing just that bit changes the reading by one count.',
    formula:'Least significant bit = sample % 2',value:n=>n%2,visual:n=>n.toString(2).padStart(8,'0').split('').map(b=>b==='1'?'source':'off'),legend:'Read left to right from bit 7 to bit 0. Green is one and gray is zero.'},
  {id:'signals-sampling',chapter:'Digital signals',title:'Measure samples per cycle',control:'Sampling rate (Hz)',min:8,max:48,initial:8,target:32,unit:'samples per cycle',
    brief:'Sample a 4 Hz sine wave at 32 Hz. Predict how many equally spaced readings fall within one cycle, then compare the shape at 8 Hz.',
    study:'Dividing sample rate by signal frequency gives readings per period. Phase affects which values are captured. Two samples per cycle can miss the shape entirely.',
    formula:'Samples per cycle = sample rate / signal frequency',value:n=>n/4,visual:n=>Array.from({length:n},(_,i)=>Math.sin(2*Math.PI*4*i/n)),legend:'One second of readings. The bars show amplitude relative to zero.'}
];
scenarios.push(
  {id:'model-recall',chapter:'Model evaluation',title:'Read a classifier result',control:'Detected positives out of 20 actual positives',min:0,max:20,initial:8,target:16,unit:'percent recall',
    brief:'Twenty samples in a validation set are positive. Predict recall when the classifier finds sixteen. Change the count and inspect the missed examples.',
    study:'Recall asks what fraction of the actual positives the model found. Precision asks a different question about all the predictions it called positive.',
    formula:'Recall (%) = 100 × detected positives / actual positives',value:n=>5*n,visual:n=>Array.from({length:20},(_,i)=>i<n?'source':'alert'),legend:'Green samples were detected. Red samples were missed.'},
  {id:'electronics-divider',chapter:'Electronics',title:'Probe a resistor divider',control:'Lower resistor (kΩ)',min:1,max:9,initial:1,target:3,unit:'volts',
    brief:'A 12 V ideal source drives two resistors in series. The upper resistor is 1 kΩ. Predict the unloaded midpoint voltage with 3 kΩ below the probe.',
    study:'Both resistors carry the same current. The larger resistance drops more voltage. Compare your result with a voltage-divider build in the circuit simulator.',
    formula:'Midpoint voltage = 12 × lower resistance / (1 + lower resistance)',value:n=>12*n/(1+n),visual:n=>Array.from({length:24},(_,i)=>i<Math.round(24*n/(1+n))?'source':'off'),legend:'Each green cell represents about half a volt at the probe.'}
);

function burstQueue(workers) {
  // Discrete one-second arrivals, then service, with unused capacity expiring.
  let waiting = 0, peak = 0;
  for (const arrivals of [3,18,20,0,0]) {
    waiting = Math.max(0, waiting + arrivals - 4*workers);
    peak = Math.max(peak, waiting);
  }
  return peak;
}
function queueDiagram(count, maximum) {
  return Array.from({length:maximum},(_,i)=>i<count ? 'alert' : 'off');
}
scenarios.push(
  {id:'capacity-burst',chapter:'Capacity engineering',title:'Find the peak backlog during a burst',
    control:'Workers',min:1,max:8,initial:1,target:3,unit:'queued jobs at peak',
    brief:'A cold queue receives 3, 18, 20, 0, then 0 jobs over five seconds. Arrivals enter before service. Each worker finishes four jobs per second. Predict the largest end-of-second backlog with three workers. Compare the peak with the final queue.',
    study:'Carry the unfinished jobs between seconds. Unused capacity expires at the end of each second. Measuring only the final backlog can hide a latency spike. Try one worker and eight workers to see the limits.',
    formula:'Q[t] = max(0, Q[t−1] + arrivals[t] − 4 × workers); peak = max(Q)',
    value:burstQueue,visual:n=>queueDiagram(burstQueue(n),38),legend:'Each red cell is one job waiting at the busiest end-of-second sample.'},
  {id:'capacity-failover',chapter:'Capacity engineering',title:'Size the queue after losing a zone',
    control:'Replicas per zone',min:1,max:9,initial:2,target:4,unit:'requests waiting after the outage',
    brief:'Three equal zones serve a steady 75 requests per second. Lose one zone for 10 seconds starting with an empty queue. Each remaining replica serves 8 requests per second. Predict the outstanding requests with four replicas per zone.',
    study:'Recompute capacity using only the two healthy zones. A steady arrival rate above service capacity accumulates backlog every second. Find the smallest replica count that can absorb an outage without queuing.',
    formula:'Outstanding = 10 × max(0, 75 − 2 × replicas × 8)',
    value:n=>10*Math.max(0,75-16*n),visual:n=>Array.from({length:3*n},(_,i)=>i<n?'alert':'source'),
    legend:'Each cell is one replica. Red replicas are unavailable. Green replicas continue processing.'},
  {id:'capacity-tail',chapter:'Capacity engineering',title:'Locate the p95 latency cliff',
    control:'Slow responses in 100',min:0,max:15,initial:2,target:6,unit:'milliseconds at p95',
    brief:'In a batch of 100 requests, fast responses take 30 ms and slow ones 800 ms. Predict the nearest-rank 95th percentile with six slow responses. Compare with five to find where one response changes the reported percentile.',
    study:'Sort observed durations ascending and take the value at one-based position ceil(0.95 × N). With five slow requests the first 95 items are fast. A small slow cohort can dominate a tail percentile while the median stays fixed.',
    formula:'Rank = ceil(0.95 × 100); fast count = 100 − slow count',
    value:n=>100-n >= 95 ? 30 : 800,visual:n=>Array.from({length:100},(_,i)=>i<100-n?'network':'alert'),
    legend:'Responses are sorted by duration. Blue responses take 30 ms. Red responses take 800 ms.'}
);
