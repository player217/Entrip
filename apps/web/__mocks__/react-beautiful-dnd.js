const React = require('react');

module.exports = {
  DragDropContext: ({ children }) => React.createElement('div', null, children),
  Droppable: ({ children }) => {
    const provided = { droppableProps: {}, innerRef: jest.fn(), placeholder: null };
    return children(provided);
  },
  Draggable: ({ children }) => {
    const provided = { draggableProps: {}, dragHandleProps: {}, innerRef: jest.fn() };
    return children(provided);
  },
};

