declare module "react-syntax-highlighter" {
  import { ComponentType } from "react";
  export const Prism: ComponentType<any>;
  export const Light: ComponentType<any>;
  export default ComponentType<any>;
}

declare module "react-syntax-highlighter/dist/cjs/styles/prism" {
  export const oneDark: any;
  export const oneLight: any;
  export const dracula: any;
  export const okaidia: any;
  export const solarizedlight: any;
  export const tomorrow: any;
  export const twilight: any;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneDark: any;
  export const oneLight: any;
  export const dracula: any;
  export const okaidia: any;
  export const solarizedlight: any;
  export const tomorrow: any;
  export const twilight: any;
}
