# React + Vite

## Find the code behind anything on the page

While the app is running in dev (`npm run dev`), you can jump from anything you
see in the browser straight to the code that made it:

- **Windows:** hold **Alt** and click the element.
- **Mac:** hold **Option** and click the element.

VS Code pops open at the exact JSX line for that element, so you can find and
edit the right file fast. (Tip: hold Alt/Option to highlight what you're about
to inspect before clicking.)

This only works in dev — it is automatically stripped from `npm run build`, so
it never ships to real users.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
