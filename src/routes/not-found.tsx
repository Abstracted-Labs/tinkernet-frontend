import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <>
      <div className="mx-auto flex items-center my-24 flex-col gap-4 px-2 sm:px-8 xl:p-0">
        <h1 className="text-4xl font-bold">Page not found</h1>

        <span>
          I think you&apos;re lost. Let&apos;s get you back home to{" "}
          <Link to="/" className="text-amber-400">
            Overview
          </Link>
        </span>
      </div>
    </>
  );
};

export default NotFound;
