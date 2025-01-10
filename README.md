# @tscircuit/eval

Evaluate a tscircuit snippet into Circuit JSON with automatic importing and
transpilation

> Want to run this in a background webworker? Use [tscircuit/eval-webworker](https://github.com/tscircuit/eval-webworker)

## Usage

```tsx
const circuitEvaluator = new CircuitEvaluator({
  snippetsApiBaseUrl: "https://registry-api.tscircuit.com",
})

await circuitEvaluator.execute(`
  import { RedLed } from "@tsci/seveibar.red-led"

  circuit.add(
    <board width="10mm" height="10mm">
      <RedLed name="LED1" />
    </board>
  )
`)

await circuitEvaluator.renderUntilSettled()

const circuitJson = await circuitEvaluator.getCircuitJson()
```

## Development

- This code is designed to be able to be run inside a WebWorker or normally
- All dependencies are peer dependencies, we don't want to select the version
  of [@tscircuit/core](https://github.com/tscircuit/core) that module users must
  use
