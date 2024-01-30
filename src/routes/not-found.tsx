import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0 gap-3">
      <div className="z-10 w-full">
        <h2 className="lg:text-xl font-bold mt-[8px] lg:mt-[12px] mb-[20px] lg:mb-[24px] flex flex-row items-center gap-4">
          <span>Page not found</span>
        </h2>

        <span className="text-sm">
          I think you&apos;re lost. Let&apos;s get you back on track.{" "}
          <Link to="/" className="text-amber-400">
            Go to Home
          </Link>
        </span>
      </div>
    </div>
  );
};

export default NotFound;
