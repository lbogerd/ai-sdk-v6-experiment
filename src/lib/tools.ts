import { tool } from 'ai'
import fs from 'node:fs/promises'
import path from 'node:path'
import z from 'zod'

const ROOT = path.resolve(process.cwd(), 'project-folder') // restrict access

export const tools = {
  fs_list: tool({
    description: 'List files in a directory (relative to project root).',
    inputSchema: z.object({
      dir: z.string(),
    }),
    execute: async ({ dir }) => {
      const absoluteDirectory = path.resolve(ROOT, dir)
      if (!absoluteDirectory.startsWith(ROOT))
        throw new Error('Path escape blocked')

      const items = await fs.readdir(absoluteDirectory, { withFileTypes: true })
      return items.map((d) => ({
        name: d.name,
        kind: d.isDirectory() ? 'dir' : 'file',
      }))
    },
  }),

  fs_read: tool({
    description: 'Read a UTF-8 text file.',
    inputSchema: z.object({
      file: z.string(),
      maxBytes: z.number().optional(),
    }),
    execute: async ({ file, maxBytes }) => {
      const absoluteFile = path.resolve(ROOT, file)
      if (!absoluteFile.startsWith(ROOT)) throw new Error('Path escape blocked')

      const buffer = await fs.readFile(absoluteFile)
      const max = maxBytes ?? 120_000

      return buffer.subarray(0, max).toString('utf8')
    },
  }),

  fs_write: tool({
    description:
      'Write a UTF-8 text file. Prefer passing a unified diff in `patch` when editing.',
    inputSchema: z.object({
      file: z.string(),
      contents: z.string().optional().describe('Full file contents'),
      patch: z
        .string()
        .optional()
        .describe('unified diff instead of full overwrite'),
    }),
    execute: async ({ file, contents, patch }) => {
      const absoluteFile = path.resolve(ROOT, file)
      const originalBuffer = await fs
        .readFile(absoluteFile)
        .catch((err: any) => {
          if (!absoluteFile.startsWith(ROOT))
            throw new Error('Path escape blocked')
          if (err && err.code === 'ENOENT') return Buffer.from('')
          throw err
        })

      let newContents: string
      if (patch) {
        const origStr = originalBuffer.toString('utf8')
        newContents = applyUnifiedDiff(origStr, patch)
      } else if (typeof contents === 'string') {
        newContents = contents
      } else {
        throw new Error('Provide `contents` or `patch`')
      }

      await fs.mkdir(path.dirname(absoluteFile), { recursive: true })
      await fs.writeFile(absoluteFile, newContents, 'utf8')

      return { ok: true, wroteBytes: Buffer.byteLength(newContents) }
    },
  }),

  fs_delete: tool({
    description: 'Delete a file or directory (recursively for directories).',
    inputSchema: z.object({
      path: z.string(),
    }),
    execute: async ({ path: targetPath }) => {
      const absolutePath = path.resolve(ROOT, targetPath)
      if (!absolutePath.startsWith(ROOT)) throw new Error('Path escape blocked')

      await fs.rm(absolutePath, { recursive: true, force: true })

      return { ok: true }
    },
  }),

  npm_install: tool({
    description: 'Install npm packages in the project-folder.',
    inputSchema: z.object({
      packages: z.array(z.string()).describe('List of npm packages to install'),
    }),
    execute: async ({ packages }) => {
      const { exec } = await import('node:child_process')
      const util = await import('node:util')
      const execPromise = util.promisify(exec)

      const pkgList = packages.join(' ')
      const command = `npm install ${pkgList}`

      try {
        const { stdout, stderr } = await execPromise(command, { cwd: ROOT })
        if (stderr) {
          console.error('npm install stderr:', stderr)
        }

        return { ok: true, stdout }
      } catch (error: any) {
        console.error('npm install error:', error)
        return { ok: false, error: error.message }
      }
    },
  }),

  npm_list_scripts: tool({
    description:
      'List available npm scripts in the project-folder package.json.',
    inputSchema: z.object({}),
    execute: async () => {
      const packageJsonContent = await fs.readFile(
        path.resolve(ROOT, 'package.json'),
        'utf8',
      )
      const scripts = JSON.parse(packageJsonContent).scripts || {}

      return { ok: true, scripts }
    },
  }),

  npm_run_script: tool({
    description:
      'Run an npm script defined in the project-folder package.json.',
    inputSchema: z.object({
      script: z.string().describe('The npm script to run'),
    }),
    execute: async ({ script }) => {
      const { exec } = await import('node:child_process')
      const util = await import('node:util')
      const execPromise = util.promisify(exec)

      const command = `npm run ${script}`

      try {
        const { stdout, stderr } = await execPromise(command, { cwd: ROOT })
        if (stderr) {
          console.error('npm run stderr:', stderr)
        }

        return { ok: true, stdout }
      } catch (error: any) {
        console.error('npm run error:', error)
        return { ok: false, error: error.message }
      }
    },
  }),
}

/**
 * Apply a unified diff (patch in "diff -u" / "git diff" format) to an original text and return the patched text.
 *
 * This function parses a unified diff string containing one or more hunks and applies those hunks
 * to the provided original content. It supports CRLF or LF line separators in the patch input,
 * recognizes the hunk header format (e.g. "@@ -start,count +start,count \@@"), and understands
 * the three unified-diff line prefixes:
 *  - ' ' (space) for context lines (must match the original),
 *  - '-' for removals (must match the original and are not included in the result),
 *  - '+' for additions (included in the result).
 *
 * Special-case handling:
 *  - Lines equal to "\ No newline at end of file" are ignored.
 *  - Empty lines in the patch are treated as unexpected and skipped.
 *  - File headers and other metadata before the first hunk are skipped.
 *  - Unknown line prefixes are logged to console.error and skipped.
 *  - If a hunk's old-count is specified but the hunk body omits some original lines, the function
 *    will leniently copy the missing original lines as context.
 *
 * Limitations / Notes:
 *  - Hunk header parsing uses the regex: /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? \@@/
 *    which expects 1-based line numbers and an optional count (defaulting to 1 if omitted).
 *  - The function splits the original by '\n' and joins the result with '\n', so final line ending
 *    behavior may differ from the input (for example, handling of a missing trailing newline at EOF).
 *  - Context (' ') and removal ('-') lines must exactly match the corresponding original lines,
 *    otherwise an Error will be thrown.
 *
 * @param orig - The original file contents as a single string.
 * @param patch - The unified diff (patch) to apply to the original contents.
 * @returns The patched file contents as a single string (lines joined with '\n').
 *
 * @throws {Error} If a context line or a removal line in the patch does not match the original
 *                  content ("Patch failed: context mismatch" or "Patch failed: removal mismatch").
 */
function applyUnifiedDiff(orig: string, patch: string) {
  const originalLinesArray = orig.split('\n')
  const splitPatchLines = patch.split(/\r?\n/)
  let i = 0
  let originalPointer = 0
  const result: string[] = []

  const hunkHeaderRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

  while (i < splitPatchLines.length) {
    const line = splitPatchLines[i]
    const match = line.match(hunkHeaderRegex)
    if (!match) {
      i++
      continue // skip file headers / metadata until first hunk
    }

    const oldStart = parseInt(match[1], 10)
    const oldCount = match[2] ? parseInt(match[2], 10) : 1

    // copy unchanged lines from orig up to hunk start (oldStart is 1-based)
    const copyUpTo = oldStart - 1
    while (
      originalPointer < copyUpTo &&
      originalPointer < originalLinesArray.length
    ) {
      result.push(originalLinesArray[originalPointer])
      originalPointer++
    }

    // advance past header
    i++

    // process hunk body
    let seen = 0
    while (
      i < splitPatchLines.length &&
      !splitPatchLines[i].startsWith('@@ ')
    ) {
      const patchLine = splitPatchLines[i]

      // ignore indicators about no newline at end of file
      if (patchLine === '\\ No newline at end of file') {
        i++
        continue
      }
      if (patchLine.length === 0) {
        // empty line in patch represents a context/added/removed empty line,
        // but unified diff always prefixes lines; treat as unexpected and skip
        i++
        continue
      }

      const prefix = patchLine[0]
      const content = patchLine.slice(1)

      if (prefix === ' ') {
        // context line: must match original
        if (
          originalPointer >= originalLinesArray.length ||
          originalLinesArray[originalPointer] !== content
        ) {
          throw new Error('Patch failed: context mismatch')
        }
        result.push(content)

        originalPointer++
        seen++
      } else if (prefix === '-') {
        // removal: must match original, do not append
        if (
          originalPointer >= originalLinesArray.length ||
          originalLinesArray[originalPointer] !== content
        ) {
          throw new Error('Patch failed: removal mismatch')
        }

        originalPointer++
        seen++
      } else if (prefix === '+') {
        // addition: append, do not advance originalPointer
        result.push(content)
      } else {
        // unknown line type, log and skip
        console.error('Skipping unknown line prefix in patch:', patchLine)
      }

      i++
    }

    // optional sanity: ensure we've consumed the expected number of original lines for this hunk
    // (oldCount can be 0)
    // If oldCount specified, origPtr should now be oldStart -1 + oldCount
    if (typeof oldCount === 'number') {
      // compute target pointer
      const targetPointer = oldStart - 1 + oldCount
      // If origPtr is behind targetPtr, copy remaining original lines (leniency)
      if (originalPointer < targetPointer) {
        while (
          originalPointer < targetPointer &&
          originalPointer < originalLinesArray.length
        ) {
          // these lines were not represented in the hunk body; treat as context
          result.push(originalLinesArray[originalPointer])
          originalPointer++
        }
      }
    }
  }

  // append any trailing original lines
  while (originalPointer < originalLinesArray.length) {
    result.push(originalLinesArray[originalPointer])
    originalPointer++
  }

  return result.join('\n')
}
