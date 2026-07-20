export const queryKeys = {
  forms: {
    all: ['forms'] as const,
    list: () => [...queryKeys.forms.all, 'list'] as const,
    draft: (code: string) => [...queryKeys.forms.all, 'draft', code] as const,
  },
  components: {
    all: ['components'] as const,
    list: () => [...queryKeys.components.all, 'list'] as const,
  },
};
