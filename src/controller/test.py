# This code shows, if each peer is in a 1-torus and has a random connection,
# The time for a message to go through the whole torus is O(log(n))

import numpy as np
import copy


# Construct a torus and a random connection list
def torus(n):
    arr = np.arange(n)
    np.random.shuffle(arr)
    edges = [[n-1,1,arr[0]]]
    for i in range(1,n-1):
        edges.append([i-1,i+1,arr[i]])
    edges.append([n-2,0,arr[n-1]])
    #print(edges)
    return edges
    
# Return the time for a message going through the torus
def trans(edges):
    n = len(edges)
    vertices = np.zeros(n)
    vertices[0]=1
    time=0
    while(True):
        vertices2= copy.deepcopy(vertices) 
        #print('time:',time,'vertices1:',vertices)
        time += 1
        
        for index in range(len(vertices)):
            if vertices[index] == 1:
                vertices2[edges[index][0]]=1
                vertices2[edges[index][1]]=1
                vertices2[edges[index][2]]=1
        if (0 in vertices2):
            vertices= copy.deepcopy(vertices2)
        else:
            break
    return time

import matplotlib.pyplot as plt
print(trans(torus(1000)))
h = [0,1,2,3,4,5]  #np.arange(2,10000,100)
plt.plot(h,[trans(torus(10**hh)) for hh in h], 'g', label='time')
