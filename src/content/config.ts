import { defineCollection, z } from 'astro:content';

const docsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  icon: z.string().optional(),
});

const pagesSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});

export const collections = {
  docs: defineCollection({ type: 'content', schema: docsSchema }),
  'docs-en': defineCollection({ type: 'content', schema: docsSchema }),
  pages: defineCollection({ type: 'content', schema: pagesSchema }),
  'pages-en': defineCollection({ type: 'content', schema: pagesSchema }),
};
