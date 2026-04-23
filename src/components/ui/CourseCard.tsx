interface CourseCardProps {
  title: string;
  description: string;
  color?: string;
}

export default function CourseCard({ title, description, color = "bg-blue-500" }: CourseCardProps) {
  return (
    <div className={`${color} p-4 rounded-lg shadow-md text-white`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm mt-2">{description}</p>
    </div>
  );
}
