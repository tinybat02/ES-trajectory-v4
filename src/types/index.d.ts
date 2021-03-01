declare module '*.png';

declare module 'react-search-box' {
  export default class ReactSearchBox extends React.Component<SearchBoxProps> {}

  interface SearchBoxProps {
    placeholder?: string;
    data: Array<{ key: string; value: string }>;
    onSelect: (record: { key: string; value: string }) => void;
    fuseConfigs: { threshold: number };
    value: string;
  }
}
