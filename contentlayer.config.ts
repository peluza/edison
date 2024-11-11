import { defineDocumentType, makeSource } from 'contentlayer/source-files';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode, { Options as PrettyCodeOptions } from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export const Project = defineDocumentType(() => ({
  name: 'Project',
  filePathPattern: `./projects/**/*.mdx`,
  contentType: 'mdx',
  fields: {
    published: {
      type: 'boolean',
      default: false,
    },
    title: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
      required: true,
    },
    date: {
      type: 'date',
      required: false,
    },
    url: {
      type: 'string',
      required: false,
    },
    repository: {
      type: 'string',
      required: false,
    },
  },
  computedFields: {
    slug: {
      type: 'string',
      resolve: (doc) => doc._raw.flattenedPath.replace(/projects\/?/, ''),
    },
    path: {
      type: 'string',
      resolve: (doc) => doc._raw.flattenedPath,
    },
  },
}));

const prettyCodeOptions: PrettyCodeOptions = {
  theme: 'github-dark',
  onVisitLine(node: any) {
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }];
    }
  },
  onVisitHighlightedLine(node: any) {
    node.properties.className.push('line--highlighted');
  },
  onVisitHighlightedChars(node: any) {  // Cambié onVisitHighlightedWord a onVisitHighlightedChars
    node.properties.className = ['word--highlighted'];
  },
};

// Forzar el tipo para que coincida con la firma del plugin
export default makeSource({
  contentDirPath: 'content',
  documentTypes: [Project],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode as any, prettyCodeOptions], // Forzar tipo aquí
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ['subheading-anchor'],
            ariaLabel: 'Link to section',
          },
        },
      ],
    ],
  },
});
