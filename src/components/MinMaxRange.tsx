import { useEffect, useState } from 'react';
import { Range, getTrackBackground } from 'react-range';

interface MinMaxRangeProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

const MinMaxRange: React.FC<MinMaxRangeProps> = ({ min, max, minValue, maxValue, onMinChange, onMaxChange }) => {
  const [values, setValues] = useState([minValue, maxValue]);
  const step = 1000; // Use the step from MinMaxRangeProps if it's dynamic

  useEffect(() => {
    setValues([minValue, maxValue]);
  }, [minValue, maxValue]);

  const onChange = (values: number[]) => {
    setValues(values);
    onMinChange(values[0]);
    onMaxChange(values[1]);
  };

  return (
    <div className="flex justify-center flex-wrap">
      <Range
        values={values}
        step={step}
        min={min}
        max={max}
        onChange={onChange}
        renderTrack={({ props, children }) => (
          <div
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
            className="h-9 flex w-full"
            style={props.style}
          >
            <div
              ref={props.ref}
              className="h-[5px] w-full self-center"
              style={{
                background: getTrackBackground({
                  values: values,
                  colors: ['#202125', 'rgba(248, 206, 70, .30)', '#202125'],
                  min: min,
                  max: max
                })
              }}
            >
              {children}
            </div>
          </div>
        )}
        renderThumb={({ index, props, isDragged }) => (
          <div
            {...props}
            className="relative h-4 w-4 rounded-lg bg-tinkerYellow flex flex-row items-center justify-center shadow-md"
            style={props.style}
          >
            <div className="absolute bottom-4 text-tinkerTextGrey text-xxs px-3 rounded">
              {values[index]}
            </div>
            <div className={`h-2 w-2 p-1 rounded-lg ${ isDragged ? 'bg-white' : 'bg-tinkerGrey' }`} />
          </div>
        )}
      />
    </div>
  );
};

export default MinMaxRange;