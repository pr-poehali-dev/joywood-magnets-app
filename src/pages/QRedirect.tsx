import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const QRedirect = () => {
  const { breed } = useParams<{ breed: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/my-collection?scan=${breed ?? ""}`, { replace: true });
  }, [breed, navigate]);

  return null;
};

export default QRedirect;
