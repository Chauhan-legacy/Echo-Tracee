/**
 * Empirical Benchmarking Suite for ECHO//TRACE and echotrace-math
 * Measures real execution latency and memory usage on the current host machine.
 */
import {
  FastFourierTransform,
  ENFKalmanTracker,
  computeMUSIC,
  DenseMatrix,
  ForensicDetectorNetwork,
  PointwiseConv1D,
} from '../packages/echotrace-math/src/index';

console.log('=== ECHOTRACE-MATH EMPIRICAL HARDWARE BENCHMARKS ===\n');

// 1. FFT Benchmarks (Power-of-2 vs Bluestein prime length)
function benchmarkFFT() {
  const sizes = [1024, 2048, 4096, 1009]; // 1009 is prime (Bluestein)
  console.log('[1/4] Fast Fourier Transform (FFT) Benchmarks:');
  console.log('Length N'.padEnd(14) + 'Algorithm'.padEnd(20) + 'Iterations'.padEnd(14) + 'Total Time'.padEnd(16) + 'Avg Time / Op');
  console.log('--------------------------------------------------------------------------------');

  for (const N of sizes) {
    const isPrime = N === 1009;
    const iters = isPrime ? 500 : 2000;
    const fft = new FastFourierTransform(N);
    const rIn = new Float64Array(N);
    const iIn = new Float64Array(N);
    for (let i = 0; i < N; i++) rIn[i] = Math.sin(i * 0.1);

    const t0 = performance.now();
    for (let it = 0; it < iters; it++) {
      fft.forward(rIn, iIn);
    }
    const totalMs = performance.now() - t0;
    const avgUs = (totalMs / iters) * 1000;
    const algoName = isPrime ? 'Bluestein Chirp-Z' : 'Radix-2 DIT';

    console.log(
      `${N}`.padEnd(14) +
      algoName.padEnd(20) +
      `${iters}`.padEnd(14) +
      `${totalMs.toFixed(2)} ms`.padEnd(16) +
      `${avgUs.toFixed(2)} µs`
    );
  }
}

// 2. Kalman Filter Benchmark
function benchmarkKalman() {
  console.log('\n[2/4] Adaptive Kalman Filter (ENF Tracking):');
  console.log('Track Duration'.padEnd(18) + 'Sample Steps'.padEnd(16) + 'Total Time'.padEnd(16) + 'Avg Step Time');
  console.log('--------------------------------------------------------------------------------');

  const durationsSec = [10, 60, 600]; // 10s, 1 min, 10 min
  for (const d of durationsSec) {
    const tracker = new ENFKalmanTracker(1.0);
    const steps = d;
    const measurements = new Float64Array(steps).map((_, i) => 50.0 + 0.05 * Math.sin(i * 0.1));

    const t0 = performance.now();
    for (let i = 0; i < steps; i++) {
      tracker.step(i, measurements[i]!);
    }
    const smoothRes = tracker.smoothRTS();
    const totalMs = performance.now() - t0;
    const avgUs = (totalMs / steps) * 1000;

    console.log(
      `${d}s`.padEnd(18) +
      `${steps}`.padEnd(16) +
      `${totalMs.toFixed(2)} ms`.padEnd(16) +
      `${avgUs.toFixed(2)} µs`
    );
  }
}

// 3. MUSIC Subspace DOA Benchmark
function benchmarkMUSIC() {
  console.log('\n[3/4] MUSIC Subspace Estimation (ULA 8 sensors):');
  console.log('Sensors M'.padEnd(14) + 'Grid Steps'.padEnd(14) + 'Iterations'.padEnd(14) + 'Total Time'.padEnd(16) + 'Avg Time / Op');
  console.log('--------------------------------------------------------------------------------');

  const M = 8;
  const cov = new DenseMatrix(M, M);
  for (let r = 0; r < M; r++) {
    for (let c = 0; c < M; c++) {
      cov.set(r, c, Math.cos((r - c) * 0.4) + (r === c ? 0.1 : 0.0));
    }
  }

  const iters = 200;
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) {
    computeMUSIC(cov, 1, 100, 1.0);
  }
  const totalMs = performance.now() - t0;
  const avgMs = totalMs / iters;

  console.log(
    `${M}`.padEnd(14) +
    `181 (-90..90)`.padEnd(14) +
    `${iters}`.padEnd(14) +
    `${totalMs.toFixed(2)} ms`.padEnd(16) +
    `${avgMs.toFixed(3)} ms`
  );
}

// 4. Neural Network Forward & Backward Pass Benchmark
function benchmarkNeuralNet() {
  console.log('\n[4/4] Neural Network Forward & Backward Pass (Temporal Attention Model):');
  console.log('Batch x Time'.padEnd(16) + 'Dim'.padEnd(10) + 'Forward (ms)'.padEnd(16) + 'Backward (ms)'.padEnd(16) + 'Heap (MB)');
  console.log('--------------------------------------------------------------------------------');

  const T = 50;
  const dim = 16;
  const net = new ForensicDetectorNetwork(dim, dim);
  const layer = new PointwiseConv1D(dim, dim);
  const x = new Float64Array(T * dim);
  for (let i = 0; i < x.length; i++) x[i] = Math.sin(i * 0.1);

  // Measure Forward
  const iters = 500;
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) {
    net.forward(x, T);
  }
  const fwdMs = (performance.now() - t0) / iters;

  // Measure Layer Backward
  const gradOut = new Float64Array(T * dim).fill(0.01);
  const t1 = performance.now();
  for (let i = 0; i < iters; i++) {
    layer.backward(gradOut, x, T);
  }
  const bwdMs = (performance.now() - t1) / iters;
  const heapMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

  console.log(
    `1 x ${T}`.padEnd(16) +
    `${dim}`.padEnd(10) +
    `${fwdMs.toFixed(3)} ms`.padEnd(16) +
    `${bwdMs.toFixed(3)} ms`.padEnd(16) +
    `${heapMb} MB`
  );
}

benchmarkFFT();
benchmarkKalman();
benchmarkMUSIC();
benchmarkNeuralNet();

console.log('\nEmpirical benchmarks finished with real host measurements.\n');
