import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function TransitionsIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate("/transitions/auto-done", { replace: true });
  }, [navigate]);

  return null;
}
