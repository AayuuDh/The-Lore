import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";
import remarkGfm from "remark-gfm";
import aboutMarkdown from "../../../docs/ABOUT.md?raw";
import "./AboutPage.css";

const WHAT_IS_A_SKILL_ID = "what-is-a-skill";

function AboutHeading({ children }) {
  const id = String(children) === "What is a skill?" ? WHAT_IS_A_SKILL_ID : undefined;
  return <h2 id={id}>{children}</h2>;
}

const MARKDOWN_COMPONENTS = { h2: AboutHeading };

function AboutPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <main className="about-page">
      <article className="about-page__document">
        <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={[remarkGfm]}>
          {aboutMarkdown}
        </ReactMarkdown>
      </article>
    </main>
  );
}

export default AboutPage;