declare module 'prismjs' {
  const Prism: {
    languages: Record<string, any>;
    highlight: (code: string, grammar: any, language: string) => string;
    manual: boolean;
    util: {
      encode: (tokens: any) => any;
      tokenizePlaceholders: (text: string, tokenizer: any) => any;
    };
    tokenize: (text: string, grammar: any, language: string) => any[];
    hooks: any;
  };
  export default Prism;
}