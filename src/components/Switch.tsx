import { Switch } from "@headlessui/react";
import { useEffect, useState } from "react";

interface OnOffSwitchProps {
  onChange: (enabled: boolean) => void;
  label?: string;
  defaultEnabled?: boolean;
}

const OnOffSwitch = (props: OnOffSwitchProps) => {
  const { onChange, label } = props;
  const [enabled, setEnabled] = useState(false);

  const handleEnabledChange = (enabled: boolean) => {
    setEnabled(enabled);
    onChange(enabled);
  };

  useEffect(() => {
    setEnabled(props.defaultEnabled || false);
  }, [props.defaultEnabled]);

  return <Switch
    checked={enabled}
    onChange={handleEnabledChange}
    className={`${ enabled ? 'bg-tinkerYellow' : 'bg-tinkerLightGrey' }
    relative inline-flex h-[34px] w-[70px] shrink-0 cursor-pointer rounded-full border-[1px] border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 scale-50`}
  >
    <span className="sr-only">{label}</span>
    <span
      aria-hidden="true"
      className={`${ enabled ? 'translate-x-9' : 'translate-x-0' }
      pointer-events-none inline-block h-[30px] w-[30px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
    />
  </Switch>;
};

export default OnOffSwitch;