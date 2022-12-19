import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-2 sm:px-8 xl:p-0">
        <h1 className="text-4xl font-bold">Page not found</h1>

        <span>
          I think you&apos;re lost. Let&apos;s get you back on track.{" "}
          <Link to="/" className="text-amber-400">
            Go to Home
          </Link>
        </span>
      </div>
    </>
  );
};

export default NotFound;
