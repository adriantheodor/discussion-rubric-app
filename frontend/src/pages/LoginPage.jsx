function LoginPage() {
  const handleLogin = () => {
    window.location.href = "http://localhost:4000/auth/google";
  };

  return (
    <div className="login-page">
      <h1>Discussion Rubric App</h1>
      <button onClick={handleLogin}>Log in with Google</button>
    </div>
  );
}

export default LoginPage;
