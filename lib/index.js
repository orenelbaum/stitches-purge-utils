#! /usr/bin/env node
const fs = require('fs')
const { writeFileSync, mkdirSync } = require("fs")
var path = require("path")
const { resolve } = require('path')
const { promisify } = require('util')
const { transformFileAsync } = require("@babel/core")
const commandLineArgs = require('command-line-args')


const optionDefinitions = [
    { name: 'configuredStitchesPath', type: String },
    { name: 'utilsInputDir', type: String },
    { name: 'utilsOutputDir', type: String }
]

const options = commandLineArgs(optionDefinitions)


let getFiles
{
    // Copied from https://stackoverflow.com/a/45130990
    const readdir = promisify(fs.readdir)
    const stat = promisify(fs.stat)
    
    getFiles = async (dir) => {
        const subdirs = await readdir(dir)
        const files = await Promise.all(subdirs.map(async (subdir) => {
            const res = resolve(dir, subdir)
            return (await stat(res)).isDirectory() ? getFiles(res) : res
        }))
        return files.reduce((a, f) => a.concat(f), [])
    }
}


const CSSPropertySet = new Set()


;(async () => {
    {
        const sourceFilePaths = await getFiles("./src/example")

        await Promise.all(
            sourceFilePaths.map(sourceFilePath =>
                transformFileAsync(
                    sourceFilePath,
                    {
                        presets: ["@babel/preset-typescript"],
                        plugins: [
                            [
                                "./src/lib/scan-util-usage.babel-plugin.js",
                                {
                                    CSSPropertySet,
                                    configuredStitchesPath: options.configuredStitchesPath,
                                }
                            ]
                        ],
                        configFile: false
                    }
                )
            )
        )
    }


    fs.rmdirSync(options.utilsOutputDir, { recursive: true });
    mkdirSync(options.utilsOutputDir, { recursive: true })

    const unpurgedUtilsFolderAbsolutePath = path.resolve(options.utilsInputDir)
    const unpurgedUtilsFilePaths = await getFiles(options.utilsInputDir)

    await Promise.all(
        unpurgedUtilsFilePaths.map(unpurgedUtilsFilePath =>
            transformFileAsync(
                unpurgedUtilsFilePath,
                { 
                    plugins: [
                        "@babel/plugin-syntax-typescript",
                        ["./src/lib/transform-utils.babel-plugin.js", { CSSPropertySet }]
                    ],
                    configFile: false
                }
            ).then(purgedUtilFile => {
                const utilFileRelativePath = unpurgedUtilsFilePath.replace(unpurgedUtilsFolderAbsolutePath, "")
                const utilFileAbsolutePath = `${options.utilsOutputDir}/${utilFileRelativePath}`
                const utilsOuputDirPath = utilFileAbsolutePath.match(/(.*)[\/\\]/)[1]||''
                mkdirSync(utilsOuputDirPath, { recursive: true })
                writeFileSync(utilFileAbsolutePath, purgedUtilFile.code)
            })
        )
    )
})()