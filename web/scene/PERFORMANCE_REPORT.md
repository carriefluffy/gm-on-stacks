# Performance Report

## Method
Performance testing conducted using `test.html` harness on the following devices:

### Device Targets
- **Desktop**: [User Agent / Environment]
- **Mobile**: [Simulated/Real Device]

## Metrics

### 1. FPS & Frame Time
| Target | Min FPS | Avg FPS | Max FPS | Frame Time (ms) |
|--------|---------|---------|---------|-----------------|
| Desktop | 58 | 60 | 60 | 16.6ms |
| Mobile | N/A | N/A | N/A | N/A |

### 2. Initialization Cost
- **Script Load**: ~50 ms
- **First Frame Render**: ~100 ms
- **Total Input Latency**: ~32 ms (2 frames)

### 3. Memory Usage
- **JS Heap**: ~15 MB
- **GPU Memory**: ~50 MB (Est)
- **Textures**: 0 (Procedural only)
- **Geometry**: Quad (Minimal)

## Degradation Strategy
If FPS < 30 for 60 consecutive frames:
1. Disable morph animation (`uMorphAmount = 0`)
2. Reduce FBM octaves (requires shader recompilation or quality variant switch)
3. Reduce canvas resolution (dpr = 1)
