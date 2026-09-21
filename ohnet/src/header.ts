export type OhNetHeaderRecord = Record<string, string>

export type OhNetHeaderEntry = readonly string[]

export type OhNetHeaderEntries = Iterable<OhNetHeaderEntry>

export interface OhNetHeaderIterable {
  forEach: (callback: (value: string, key: string) => void, thisArg?: unknown) => void
}

export type OhNetHeaderLike
  = | OhNetHeader
    | OhNetHeaderRecord
    | OhNetHeaderEntries
    | OhNetHeaderIterable

const INVALID_NAME = /[^!#$%&'*+\-.^\w`|~]/

function normalizeName(name: string): string {
  const normalized = String(name).trim().toLowerCase()
  if (!normalized || INVALID_NAME.test(normalized))
    throw new TypeError(`Invalid header name: ${name}`)
  return normalized
}

function normalizeValue(value: string): string {
  const raw = String(value)
  if (/[\0\r\n]/.test(raw))
    throw new TypeError(`Invalid header value: ${value}`)
  return raw.trim()
}

export class OhNetHeader implements Iterable<[string, string]> {
  readonly #store = new Map<string, string[]>()

  constructor(init?: OhNetHeaderLike | null) {
    if (init === undefined || init === null)
      return

    if (init instanceof OhNetHeader) {
      for (const [key, values] of init.#store)
        this.#store.set(key, [...values])
      return
    }

    if (typeof (init as OhNetHeaderEntries)[Symbol.iterator] === "function") {
      for (const [key, value] of init as OhNetHeaderEntries)
        this.append(key, value)
      return
    }

    const iterable = init as OhNetHeaderIterable
    if (typeof iterable.forEach === "function") {
      iterable.forEach((value, key) => this.append(key, value))
      return
    }

    for (const [key, value] of Object.entries(init as OhNetHeaderRecord))
      this.append(key, value)
  }

  static from(init?: OhNetHeaderLike | null): OhNetHeader {
    return new OhNetHeader(init)
  }

  append(name: string, value: string): this {
    const key = normalizeName(name)
    const val = normalizeValue(value)
    const values = this.#store.get(key)
    if (values)
      values.push(val)
    else
      this.#store.set(key, [val])
    return this
  }

  set(name: string, value: string): this {
    this.#store.set(normalizeName(name), [normalizeValue(value)])
    return this
  }

  get(name: string): string | null {
    const values = this.#store.get(normalizeName(name))
    return values ? values.join(", ") : null
  }

  has(name: string): boolean {
    return this.#store.has(normalizeName(name))
  }

  delete(name: string): boolean {
    return this.#store.delete(normalizeName(name))
  }

  getSetCookie(): string[] {
    return [...(this.#store.get("set-cookie") ?? [])]
  }

  forEach(callback: (value: string, key: string, parent: OhNetHeader) => void, thisArg?: unknown): void {
    for (const [key, values] of this.#store) {
      for (const value of values)
        callback.call(thisArg, value, key, this)
    }
  }

  * keys(): IterableIterator<string> {
    for (const [key, values] of this.#store) {
      for (let i = 0; i < values.length; i++)
        yield key
    }
  }

  * values(): IterableIterator<string> {
    for (const values of this.#store.values()) {
      for (const value of values)
        yield value
    }
  }

  * entries(): IterableIterator<[string, string]> {
    for (const [key, values] of this.#store) {
      for (const value of values)
        yield [key, value]
    }
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries()
  }

  clone(): OhNetHeader {
    return new OhNetHeader(this)
  }

  concat(other: OhNetHeaderLike): OhNetHeader {
    const source = OhNetHeader.from(other)
    const result = this.clone()
    for (const [key, values] of source.#store)
      result.#store.set(key, [...values])
    return result
  }

  toRecord(): OhNetHeaderRecord {
    const record: OhNetHeaderRecord = {}
    for (const [key, values] of this.#store)
      record[key] = values.join(", ")
    return record
  }

  toJSON(): OhNetHeaderRecord {
    return this.toRecord()
  }
}
