# FlowCode Block Extensions

This directory stores all **Block Extension** files for [FlowCode](https://flowcode.artronshop.co.th) — a visual, flow-based Arduino/ESP32 code generator. Each extension adds a set of blocks for a specific library or hardware feature.

---

## File Structure

```
extension/
├── index.ts                   # Extension registry — imports and exports all extensions
├── types.ts                   # ExtensionProps type definition
├── README.md                  # This file
│
├── SHT3x.flowext.ts           # Example: SHT3x temperature & humidity sensor
├── MQTT.flowext.ts            # Example: MQTT publish/subscribe
├── NTP.flowext.ts             # Example: NTP time sync (built-in)
└── ...                        # Other extensions
```

### `*.flowext.ts` — Extension File

Each extension file exports a single `BlockCategory` object as its default export.

```ts
import type { BlockCategory } from '../types.js';

const myExtension: BlockCategory = {
  id: 'my_ext',        // unique extension ID
  name: 'My Extension',
  blocks: [ /* BlockDef[] */ ],
};

export default myExtension;
```

### `index.ts` — Extension Registry

Every extension must be imported and registered here as an `ExtensionProps` entry:

```ts
import myExtension from './MyExt.flowext';

const extensionIndex: ExtensionProps[] = [
  // ...
  {
    id: 'MyExt',
    name: 'My Extension',
    author: 'Your Name',
    description: 'Brief description of what this extension does',
    version: '1.0.0',
    depends: [ 'SomeArduinoLib@1.2.3' ],  // optional
    src: myExtension,
  },
];
```

---

## Block Definition Reference

Each block in the `blocks` array is a `BlockDef` object:

```ts
{
  id: string;           // unique block ID (snake_case)
  name: string;         // display name shown on the block
  color: string;        // hex color for the block header
  icon: string;         // emoji icon
  category: string;     // group label in the block panel
  description?: string; // tooltip / help text (supports \n)
  trigger?: boolean;    // true = event-driven block (no input flow port)

  inputs:  Port[];      // input ports  — { id, type:'input',  label, dataType }
  outputs: Port[];      // output ports — { id, type:'output', label, dataType }
  params?: ParamDef[];  // editable parameters on the block

  // Optional: returns a C expression directly (no variable declaration)
  toExpr?: (params) => string;

  // Optional: recomputes ports when params change
  dynamicPorts?: (params) => { inputs?: Port[]; outputs?: Port[] };

  // Required: generates the C++ code for this block
  toCode: (ctx: CodeGenContext) => CodeResult;
}
```

### Data Types (`DataType`)

| Value    | C++ type              |
|----------|-----------------------|
| `void`   | control flow only     |
| `bool`   | `bool`                |
| `byte`   | `uint8_t`             |
| `char`   | `char`                |
| `int`    | `int`                 |
| `long`   | `long`                |
| `float`  | `float`               |
| `double` | `double`              |
| `String` | Arduino `String`      |
| `any`    | accepts any type      |

### `toCode` Context (`CodeGenContext`)

| Property / Method | Description |
|---|---|
| `block` | The `CanvasBlock` being code-generated |
| `params` | Block parameter values keyed by `id` |
| `pad` | Indentation string for the current depth |
| `safeId(id)` | Converts a block UUID to a valid C identifier |
| `resolveInput(portId)` | Returns the expression/variable connected to an input port, or `null` if disconnected |
| `captureCode(portId, depth?)` | Traverses blocks connected to an output port and returns them as a code string (used for function bodies / callback bodies) |
| `registerPreprocessor(directive)` | Emits a `#include` or `#define` at the top of the file (deduplicated) |
| `registerGlobal(declaration)` | Emits a global variable declaration before `setup()` (deduplicated by exact string) |
| `registerFunction(header, body, decl?)` | Emits a separate C function at the bottom of the file with an optional forward declaration |
| `registerPollingCode(code)` | Injects code into the Arduino `loop()` function |

### `toCode` Return Value (`CodeResult`)

```ts
{
  parts: Array<
    | string[]   // lines of C++ code to emit
    | { portId: string; depthDelta: number }  // traverse output port inline
  >;
}
```

---

## Development Guide

### 1. Create the extension file

Create `src/lib/blocks/extension/MyLib.flowext.ts`:

```ts
import type { BlockCategory } from '../types.js';

const COLOR = '#0ea5e9';

const myLibExtension: BlockCategory = {
  id: 'mylib',
  name: 'My Library',
  blocks: [
    {
      id: 'mylib_begin',
      name: 'MyLib Begin',
      color: COLOR,
      icon: '🔧',
      category: 'MyLib',
      description: 'Initialize MyLib',
      inputs:  [{ id: 'in',  type: 'input',  label: '➜', dataType: 'any'  }],
      outputs: [{ id: 'out', type: 'output', label: '➜', dataType: 'void' }],
      params: [
        { id: 'pin', type: 'number', label: 'Pin', default: '4' },
      ],
      toCode({ pad, params, registerPreprocessor }) {
        registerPreprocessor('#include <MyLib.h>');
        const pin = params.pin ?? '4';
        return {
          parts: [
            [`${pad}MyLib.begin(${pin});`],
            { portId: 'out', depthDelta: 0 },
          ],
        };
      },
    },
  ],
};

export default myLibExtension;
```

### 2. Common patterns

**Expression block** — output a value with no side effects:
```ts
toExpr: (params) => `analogRead(${params.pin ?? '34'})`,
toCode() { return { parts: [] }; }
```

**Trigger block** — event-driven (no input flow port), runs code in a callback:
```ts
trigger: true,
inputs: [],
toCode({ captureCode, registerPreprocessor, registerFunction }) {
  registerPreprocessor('#define MY_CB _my_handler');
  const body = captureCode('out', 1);
  registerFunction('void _my_handler()', body, 'void _my_handler();');
  return { parts: [] };
},
```

**Conditional output** — branch on OK / Error:
```ts
parts: [
  [`${pad}if (myLib.doSomething()) {`],
  { portId: 'ok',    depthDelta: 1 },
  [`${pad}} else {`],
  { portId: 'error', depthDelta: 1 },
  [`${pad}}`],
  { portId: 'out', depthDelta: 0 },
]
```

**Global deduplication** — `registerGlobal` deduplicates by exact string, so use a consistent fixed string (not block-ID-based) for shared globals:
```ts
registerGlobal('WiFiClientSecure _my_client;');
```

### 3. Register the extension

Add an entry to `index.ts`:

```ts
import myLibExtension from './MyLib.flowext';

// inside extensionIndex array:
{
  id: 'MyLib',
  name: 'My Library',
  author: 'Your Name / Organization',
  description: 'One-sentence description',
  version: '1.0.0',
  depends: [ 'MyLib@1.2.3' ],   // Arduino Library Manager name@version
  src: myLibExtension,
},
```

### 4. Verify

```bash
npx tsc --noEmit
```

No errors = the extension is type-safe and ready.

---

## Submitting an Extension

1. **Fork** this repository and create a new branch: `extension/my-lib-name`
2. Add your `*.flowext.ts` file following the structure above
3. Register it in `index.ts`
4. Run `npx tsc --noEmit` — fix any TypeScript errors before submitting
5. Open a **Pull Request** with:
   - A short description of what the extension adds
   - The Arduino library it depends on (name + version)
   - A brief example of what code the blocks generate

### Checklist

- [ ] File is named `<LibraryName>.flowext.ts` (PascalCase)
- [ ] Block IDs are globally unique (`snake_case`, e.g. `mylib_begin`)
- [ ] `registerPreprocessor` is used for all `#include` directives
- [ ] `registerGlobal` strings are deterministic (not block-ID-based) for shared objects
- [ ] All `toCode` implementations return a valid `CodeResult`
- [ ] Passes `npx tsc --noEmit` with no errors
- [ ] Extension is registered in `index.ts` with correct `depends` versions
