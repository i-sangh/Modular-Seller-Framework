const Home = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-primary-600 mb-4 text-center">
          Welcome to Home Page
        </h1>
        <p className="text-lg text-gray-600 text-center max-w-2xl">
          This is a simple MERN application with authentication features.
          Click on the Login/Sign Up button in the navigation bar to get started.
        </p>
      </div>
    );
  };
  
  export default Home;