const HEIGHT = 24;

const LineChart = ({ fill }: { fill: number }) => {
  return (
    <svg width="100%" height={HEIGHT} className="overflow-hidden rounded-md">
      <rect x="0" y="0" width="100%" height={HEIGHT} fill="black" />
      <rect x="0" y="0" width={`${fill}%`} height={HEIGHT} fill="#FCD34D" />
    </svg>
  );
};

export default LineChart;
