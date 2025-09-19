function LoginPage() {
  const handleLogin = () => {
    const BACKEND_URL = "https://discussion-rubric-app.onrender.com";
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  return (
    <div className="login-page">
      <h1>Discussion Rubric App</h1>
      <button onClick={handleLogin}>Log in with Google</button>
    </div>
  );
}

export default LoginPage;
