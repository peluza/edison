// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer/source-files";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
var Project = defineDocumentType(() => ({
  name: "Project",
  filePathPattern: `./projects/**/*.mdx`,
  contentType: "mdx",
  fields: {
    published: {
      type: "boolean",
      default: false
    },
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string",
      required: true
    },
    date: {
      type: "date",
      required: false
    },
    url: {
      type: "string",
      required: false
    },
    repository: {
      type: "string",
      required: false
    }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace(/projects\/?/, "")
    },
    path: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath
    }
  }
}));
var prettyCodeOptions = {
  theme: "github-dark",
  onVisitLine(node) {
    if (node.children.length === 0) {
      node.children = [{ type: "text", value: " " }];
    }
  },
  onVisitHighlightedLine(node) {
    node.properties.className.push("line--highlighted");
  },
  onVisitHighlightedChars(node) {
    node.properties.className = ["word--highlighted"];
  }
};
var contentlayer_config_default = makeSource({
  contentDirPath: "content",
  documentTypes: [Project],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, prettyCodeOptions],
      // Forzar tipo aquí
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section"
          }
        }
      ]
    ]
  }
});
export {
  Project,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-O3B3F6NF.mjs.map
