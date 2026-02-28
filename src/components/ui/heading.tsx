interface HeadingProps {
  title: string;
  description: string;
  className?: string; // Adding optional className prop
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  description,
  className
}) => {
  return ( 
    <div className={className}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
};

