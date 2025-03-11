import { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface DndContextProps {
  children: ReactNode;
}

export const DndContext = ({ children }: DndContextProps) => {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
};
