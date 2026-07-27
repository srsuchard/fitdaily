// Ambient declarations for CSS imports used on web (Expo's Metro web bundler
// resolves these at runtime; these types only satisfy `tsc --noEmit`).

// CSS Modules — default export maps class names to generated identifiers.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Plain / global stylesheets imported for their side effects.
declare module '*.css';
