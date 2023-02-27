interface Container {
  [key: symbol]: any;
}

function getValue<T>(container: Container, key: symbol): T | undefined {
  return container[key];
}

function setValue<T>(
  container: Container,
  key: symbol,
  value: T | undefined,
  enumerable = false
): void {
  if (value === undefined) {
    delete container[key];
    return;
  }
  if (enumerable) {
    container[key] = value;
    return;
  }
  Object.defineProperty(container, key, {
    enumerable: false, // JSON.stringify 时隐藏 selected 字段
    value: value,
    configurable: true,
  });
}

let autoAttachKeyIndex = 0;
const autoAttachKeySymbol = Symbol("autoAttachKey");
export function autoAttachKey(
  container: Container,
  label: string = ""
): string {
  const exist = ExtValue.getValue(container, autoAttachKeySymbol);
  if (exist != null) return exist as string;
  const key = autoAttachKeyIndex++;
  ExtValue.setValue(container, autoAttachKeySymbol, key);
  return `${label}_${key}`;
}

const ExtValue = {
  getValue,
  setValue,
};
export default ExtValue;
