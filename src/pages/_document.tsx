import Document, { Head, Html, Main, NextScript, type DocumentContext, type DocumentInitialProps } from "next/document";
import getThemeStyles, { type ThemeStyles } from "@atlaskit/tokens/get-theme-styles";
import { ATLASSIAN_THEME, ATLASSIAN_THEME_ATTRIBUTE } from "@/shared/design-system/theme-config";

const initializeColorMode = `(() => {
  const key = "retrospace-color-mode";
  let saved = null;
  try { saved = window.localStorage.getItem(key); } catch (_) {}
  const valid = saved === "light" || saved === "dark";
  const mode = valid ? saved : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const root = document.documentElement;
  root.setAttribute("data-color-mode", mode);
})();`;

export default class RetrospaceDocument extends Document<DocumentInitialProps & { themeStyles: ThemeStyles[] }> {
  static async getInitialProps(ctx: DocumentContext) {
    const [initialProps, themeStyles] = await Promise.all([
      Document.getInitialProps(ctx),
      getThemeStyles({ ...ATLASSIAN_THEME, colorMode: "auto" }),
    ]);
    return { ...initialProps, themeStyles };
  }

  render() {
    return (
      <Html
        lang="en"
        data-theme={ATLASSIAN_THEME_ATTRIBUTE}
        data-color-mode="dark"
        suppressHydrationWarning
      >
        <Head>
          {this.props.themeStyles.map(({ id, attrs, css }) => (
            <style key={id} {...attrs} dangerouslySetInnerHTML={{ __html: css }} />
          ))}
          <script id="color-mode-init" dangerouslySetInnerHTML={{ __html: initializeColorMode }} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
