---
description: 'Help developers understand, implement, and debug doubly linked lists.
  Use this skill when working with bidirectional data structures, implementing LRU
  caches, undo/redo stacks, browser history, or any scenario requiring efficient insertion/deletion
  at both ends or traversal in both directions. Example prompts: ''Implement a doubly
  linked list with insert and delete methods'', ''Debug my doubly linked list traversal'',
  ''How do I reverse a doubly linked list?'', ''Build an LRU cache using a doubly
  linked list''.'
id: doubly-linked-list-help
name: Doubly Linked List Assistant
---

# Doubly Linked List Assistant

## Instructions

A doubly linked list is a data structure where each node contains:
- A value/data
- A pointer to the next node
- A pointer to the previous node

This enables bidirectional traversal and efficient insertion/deletion at any position when you have a reference to that node.

### When to use doubly linked lists:
- **LRU/MRU caches**: Track recently used items with efficient reordering
- **Browser history**: Navigate forward and backward
- **Undo/redo stacks**: Maintain state changes in both directions
- **Music playlists**: Skip forward and backward through songs
- **Text editors**: Cursor movement in both directions
- **Task scheduling**: Insert tasks with priority at any position

### Core Operations:

**Node Structure:**
```
Node {
  data: any
  next: Node | null
  prev: Node | null
}
```

**Common methods to implement:**
1. **Insert at head**: O(1) - add node at the beginning
2. **Insert at tail**: O(1) - add node at the end
3. **Insert at position**: O(n) - add node between existing nodes
4. **Delete node**: O(1) if you have node reference, else O(n)
5. **Search/Find**: O(n) - traverse to find a value
6. **Traverse forward**: O(n) - iterate from head to tail
7. **Traverse backward**: O(n) - iterate from tail to head
8. **Reverse**: O(n) - reverse the entire list

### Implementation Tips:
- Maintain both `head` and `tail` pointers for O(1) operations at both ends
- When inserting, update both `next` and `prev` pointers carefully
- When deleting, handle edge cases: deleting head, tail, middle, or single node
- Consider sentinel nodes (dummy head/tail) to simplify edge case handling
- Use proper null checks to avoid null pointer exceptions

### Common Pitfalls:
- Forgetting to update the `prev` pointer when inserting/deleting
- Not handling edge cases (empty list, single node, head, tail)
- Creating memory leaks by not properly nullifying pointers when deleting
- Off-by-one errors when traversing

## Example

### Problem: Implement a doubly linked list with insert and delete operations

**Implementation:**
```python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None
        self.prev = None

class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
    
    def insert_head(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = self.tail = new_node
        else:
            new_node.next = self.head
            self.head.prev = new_node
            self.head = new_node
    
    def insert_tail(self, data):
        new_node = Node(data)
        if not self.tail:
            self.head = self.tail = new_node
        else:
            new_node.prev = self.tail
            self.tail.next = new_node
            self.tail = new_node
    
    def delete_node(self, node):
        if node.prev:
            node.prev.next = node.next
        else:
            self.head = node.next
        
        if node.next:
            node.next.prev = node.prev
        else:
            self.tail = node.prev
    
    def traverse_forward(self):
        result = []
        current = self.head
        while current:
            result.append(current.data)
            current = current.next
        return result
    
    def traverse_backward(self):
        result = []
        current = self.tail
        while current:
            result.append(current.data)
            current = current.prev
        return result
```

**Usage:**
```python
dll = DoublyLinkedList()
dll.insert_tail(1)
dll.insert_tail(2)
dll.insert_tail(3)
print(dll.traverse_forward())   # [1, 2, 3]
print(dll.traverse_backward())  # [3, 2, 1]
```

Provide specific code snippets, pseudocode, debugging guidance, or algorithm explanations as needed for the user's specific doubly linked list task.