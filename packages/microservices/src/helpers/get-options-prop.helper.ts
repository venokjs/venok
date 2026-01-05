export const getOptionsProp: {
  <
    Options extends Record<string, any>,
    Attribute extends keyof Options
  >(obj: Options, prop: Attribute): Options[Attribute];
  <
    Options extends Record<string, any>,
    Attribute extends keyof Options,
    DefaultValue extends Options[Attribute] = Options[Attribute]
  >(obj: Options, prop: Attribute, defaultValue: DefaultValue): Required<Options>[Attribute];
} = <
  Options extends Record<string, any>,
  Attribute extends keyof Options,
  DefaultValue extends Options[Attribute] = Options[Attribute]
>(
  obj: Options, 
  prop: Attribute, 
  defaultValue: DefaultValue = undefined as DefaultValue
): never extends DefaultValue ? Options[Attribute] : Required<Options>[Attribute] => {
  return obj && prop in obj ? (obj as any)[prop] : defaultValue;
};