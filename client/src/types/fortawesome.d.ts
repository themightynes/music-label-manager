declare module '@fortawesome/react-fontawesome';
declare module '@fortawesome/fontawesome-svg-core' {
  export type IconPrefix = string;
  export type IconProp = any;
  export const config: Record<string, unknown>;
  export const library: { add: (...icons: unknown[]) => void };
}
declare module '@fortawesome/free-solid-svg-icons' {
  export const fas: unknown;
}
declare module '@fortawesome/free-regular-svg-icons' {
  export const far: unknown;
}
declare module '@fortawesome/free-brands-svg-icons' {
  export const fab: unknown;
}
