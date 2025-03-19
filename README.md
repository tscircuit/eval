# @tscircuit/eval

Evaluate code in a full tscircuit runtime environment, including babel
transpilation and execution, so you just need to send the code to be executed
with automatic handling of imports from `@tsci/*`

The `circuit` object from `@tscircuit/core` is already exposed on the global
scope. All imports from `@tsci/*` are automatically handled.

## Usage Options

### 1. Quick Use: `runTscircuitCode`

Quickly run tscircuit code in the main thread. You can also supply a virtual
filesystem to run multiple files.

```tsx
import { runTscircuitCode } from "@tscircuit/eval"

const circuitJson = await runTscircuitCode(`
export default () => (
  <resistor name="R1" resistance="1k" />
)
`)

// You've got Circuit JSON!
console.log(circuitJson)
```

### 2. Using CircuitWebWorker (Web Worker)

```tsx
import { createCircuitWebWorker } from "@tscircuit/eval"

const circuitWebWorker = createCircuitWebWorker()

await circuitWebWorker.execute(`
import { RedLed } from "@tsci/seveibar.red-led"

circuit.add(
  <board width="10mm" height="10mm">
    <RedLed />
  </board>
)
`)

await circuitWebWorker.renderUntilSettled()

const circuitJson = await circuitWebWorker.getCircuitJson()
```

### 3. Using CircuitRunner Directly

For simple cases where you don't need web worker isolation, you can use CircuitRunner directly in the main thread:

```tsx
import { CircuitRunner } from "@tscircuit/eval"

const circuitRunner = new CircuitRunner()

await circuitRunner.execute(`
import { RedLed } from "@tsci/seveibar.red-led"

circuit.add(
  <board width="10mm" height="10mm">
    <RedLed name="LED1" />
  </board>
)`)

await circuitRunner.renderUntilSettled()

const circuitJson = await circuitRunner.getCircuitJson()
// Validate circuit elements
const led = circuitJson.find((el) => el.name === "LED1")
```

### 4. Using Virtual Filesystem

You can also execute code using a virtual filesystem, which is useful when you have multiple files or components:

```tsx
import { createCircuitWebWorker } from "@tscircuit/eval"

const circuitWebWorker = createCircuitWebWorker()

await circuitWebWorker.executeWithFsMap({
  fsMap: {
    "entrypoint.tsx": `
      import { MyLed } from "./myled.tsx"
      
      circuit.add(
        <board width="10mm" height="10mm">
          <MyLed name="LED1" />
        </board>
      )
    `,
    "myled.tsx": `
      import { RedLed } from "@tsci/seveibar.red-led"
      
      export const MyLed = ({ name }) => {
        return <RedLed name={name} />
      }
    `,
  },
  entrypoint: "entrypoint.tsx",
})

await circuitWebWorker.renderUntilSettled()

const circuitJson = await circuitWebWorker.getCircuitJson()
```

## When to Use Which Approach

**CircuitRunner (Direct Execution)**

- ✅ Simple debugging
- ✅ No worker setup required
- ❌ Blocks main thread
- ❌ No isolation from host environment

**CircuitWebWorker (Web Worker)**

- ✅ Non-blocking execution
- ✅ Isolated environment
- ✅ Better for production use
- ❌ More complex setup
- ❌ Comlink overhead for communication

## Why use a web worker?

tscircuit can block the ui thread in a browser. In addition, tscircuit sometimes
freezes during the render loop due to autorouting or other computationally
intensive operations. Executing tscircuit code in a web worker allows the ui
to display the rendering process without freezing, and stop rendering if it
goes on for too long.

## Execution Implementation

1. The execution code is scanned for imports, these imports are then loaded
   via fetch from the CDN and added to a global import map.
2. The code is transpiled. Imports/requires automatically check the import map.
3. The transpiled code is executed with a `circuit` object added to the global
   scope.
4. When a user calls `circuitWebWorker.renderUntilSettled()`, the web worker
   the webworker runs `circuit.renderUntilSettled()`
