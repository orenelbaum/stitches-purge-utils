# stitches-purge-utils

'stitches-purge-utils` is a tool for purging Stitches utils.

This package is in early development so some features are missing, but it should be already useable. Do not use in production without proper testing.

[See usage example](https://github.com/orenelbaum/stitches-purge-utils-example)

## Usage

1. Put all of the files containing your utils in one folder. In each file export an object literal containing all of the utils defined in that file as a named export called `utilList`.
Create one file in this folder that is exports all of the utils from the other files.
This folder will be provided to the script as the `utilsInputDir` option.

2. Decide on the folder this plugin will emit the purged utils into.
The plugin will copy your util files into that folder with all of the unused utils from the `utilList` exports removed.
This folder will be provided to the script as the `utilsOutputDir` option.

3. Create an alias that in development will be resolved to the file exporting all of the utils from the folder with the unpurged utils and in production will be resolved to the file exporting all of the utils from the folder with the purged utils.
In your typescript config resovle that alias to the file from the folder with the unpurged utils (so that we always the types for all the utils available).

4. Create a file that exports your configured `css`, `globalCss` and `styled` functions as named exports with those names.

5. In this file import the utils from the alias we made in step 3.

6. Create an alias for this file (the file we created in step 4). This alias will be provided to the script as the `configuredStitchesPath` option.

7. In the rest of your code whenever you want to write styles objects, import `css` or `styled` through the alias we made in the previous step. Make sure that your style object is one of the arguments to either of those functions.
If you want to write global styles, import the `globalCss` function from this alias, and provide your global styles as one of the arguments for this function.

8. Before building for production, run the utils purge script with the options described above.


## Setup with Vite

Install the package with

```bash
npm i -D stitches-purge-utils
```

Add this to your Vite config

```ts
import path from "path"
import { defineConfig } from 'vite'


export default defineConfig(
    ({ mode }) => ({
        resolve: {
            alias: [
                { 
                    find: "~stitches",
                    replacement: path.resolve("../src/example/stitches")
                },
                {
                    find: "~stitches-utils",
                    replacement: mode === "production" 
                        ? path.resolve("../stitches/purged-utils/utils.ts")
                        : path.resolve("../src/stitches-utils/utils.ts")
                }
            ] 
        }
    })
)
```

Add this script to your `package.json`

```bash
"stitches:purge-utils": "stitches-purge-utils --configuredStitchesPath ~stitches --srcDir ./src --utilsInputDir ./src/stitches-utils --utilsOutputDir ./stitches/purged-utils"
```

Add this to your `tsconfig.json`

```json
{
  	"compilerOptions": {
		"baseUrl": "./",
	    "paths": {
        	"~stitches": ["src/stitches.ts"],
        	"~utils": ["src/stitches-utils/utils.ts"]
    	}
  	}
}
```


- Replace `"../src/example/stitches"` with the file that export the configured `css`, `globalCss` and `styled` (described in step 4)

- Replace `"~stitches"` with the alias for this file (described in step 6).

- Replace `"./src"` with the source directory.

- Replace `"./src/stitches-utils"` with the folder with your unpurged utils (described in step 1).

- Replace `"../src/stitches-utils/utils.ts"` with the file exporting all of your unpurged utils (described in step 1).

- Replace `"./stitches/purged-utils"` with the folder with your purged utils (described in step 2).

- Replace `"../stitches/purged-utils/utils.ts"` with the file exporting all of your purged utils (described in step 2).

- Replace `"~stitches-utils"` with the alias that will be resolved in development to your unpurged utils and in production to you purged utils (described in step 3).

Now before building you can purge the utils with
```bash
npm run stitches:purge-utils
```
