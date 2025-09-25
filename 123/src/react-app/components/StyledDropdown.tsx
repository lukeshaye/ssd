import { Dropdown, DropdownProps } from 'primereact/dropdown';
import { User } from 'lucide-react'; // Usaremos um ícone como exemplo

// Definimos as propriedades que nosso dropdown customizado aceitará
interface StyledDropdownProps<T> extends Omit<DropdownProps, 'value' | 'options' | 'onChange'> {
  value: T | null;
  options: T[];
  onChange: (value: T | null) => void;
  optionLabel?: keyof T; // A propriedade do objeto a ser exibida como texto
  placeholder?: string;
  icon?: React.ReactNode;
}

// Template para o item selecionado (o que aparece quando o dropdown está fechado)
const valueTemplate = <T,>(option: T, props: StyledDropdownProps<T>) => {
  if (!option) {
    return <span>{props.placeholder}</span>;
  }

  return (
    <div className="flex items-center">
      {props.icon}
      <div className="ml-2">{(option as any)[props.optionLabel || 'name']}</div>
    </div>
  );
};

// Template para os itens na lista (o que aparece quando o dropdown está aberto)
const itemTemplate = <T,>(option: T, props: StyledDropdownProps<T>) => {
  return (
    <div className="flex items-center">
       {props.icon}
      <div className="ml-2">{(option as any)[props.optionLabel || 'name']}</div>
    </div>
  );
};


export function StyledDropdown<T>({ value, options, onChange, optionLabel = 'name', placeholder, icon, ...rest }: StyledDropdownProps<T>) {
  return (
    <Dropdown
      value={value}
      options={options}
      onChange={(e) => onChange(e.value)}
      optionLabel={optionLabel as string}
      placeholder={placeholder}
      valueTemplate={(option) => valueTemplate(option, { placeholder, icon, optionLabel })}
      itemTemplate={(option) => itemTemplate(option, { icon, optionLabel })}
      className="w-full md:w-14rem" // Estilo padrão
      {...rest}
    />
  );
}